from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import shutil
import tempfile
import unittest
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "tools" / "travel_photo_pipeline.py"
SPEC = importlib.util.spec_from_file_location("travel_photo_pipeline", MODULE_PATH)
assert SPEC and SPEC.loader
pipeline = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(pipeline)


class FakeObject:
    def __init__(self, key: str, data: bytes):
        self.key = key
        self.data = data
        self.size = len(data)
        self.etag = hashlib.md5(data).hexdigest()  # nosec B324 - OSS-style fixture ETag only


class FakeBucket:
    def __init__(self, objects: dict[str, bytes] | None = None):
        self.objects = {key: FakeObject(key, value) for key, value in (objects or {}).items()}
        self.puts: list[tuple[str, bytes, dict[str, str]]] = []
        self.list_calls: list[str | None] = []
        self.get_calls: list[str] = []

    def list_objects(self, prefix: str, continuation_token: str | None = None):
        self.list_calls.append(continuation_token)
        keys = sorted(key for key in self.objects if key.startswith(prefix))
        start = int(continuation_token or "0")
        page = keys[start : start + 1]
        next_token = str(start + 1) if start + 1 < len(keys) else None
        return type(
            "Result",
            (),
            {
                "object_list": [self.objects[key] for key in page],
                "next_continuation_token": next_token,
                "is_truncated": next_token is not None,
            },
        )()

    def get_object(self, key: str):
        self.get_calls.append(key)
        return BytesIO(self.objects[key].data)

    def get_object_meta(self, key: str):
        if key not in self.objects:
            error = pipeline.ObjectNotFoundError("missing")
            error.status = 404
            raise error
        return type("Meta", (), {"headers": {"Content-Length": str(self.objects[key].size)}})()

    def put_object(self, key: str, stream, headers: dict[str, str]):
        data = stream.read()
        self.puts.append((key, data, headers))
        if key in self.objects:
            error = pipeline.ObjectAlreadyExistsError("exists")
            error.status = 409
            raise error
        self.objects[key] = FakeObject(key, data)


def jpeg_bytes(size: tuple[int, int] = (20, 10), orientation: int | None = None) -> bytes:
    image = Image.new("RGB", size, (18, 90, 160))
    exif = Image.Exif()
    if orientation:
        exif[274] = orientation
    exif[34853] = {1: "N", 2: (30, 0, 0)}  # GPSInfo marker; output must emit no EXIF at all.
    stream = BytesIO()
    image.save(stream, format="JPEG", quality=95, exif=exif)
    return stream.getvalue()


class TravelPhotoPipelineTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="travel-photo-pipeline-test-"))
        self.input = self.tmp / "input"
        self.input.mkdir()
        self.workspace = self.tmp / "workspace"
        self.batch = "test-batch"

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def write_jpeg(self, name: str, data: bytes | None = None):
        (self.input / name).write_bytes(data or jpeg_bytes())

    def test_prepare_transposes_and_strips_all_exif(self):
        self.write_jpeg("camera.jpg", jpeg_bytes((20, 10), orientation=6))

        manifest = pipeline.prepare_local(self.input, self.workspace, self.batch)

        self.assertEqual(manifest["batch"], self.batch)
        photo = manifest["photos"][0]
        output = self.workspace / photo["local_derivative"]
        self.assertTrue(output.is_file())
        with Image.open(output) as image:
            self.assertEqual(image.size, (10, 20))
            self.assertEqual(image.getexif(), {})
            self.assertNotIn("exif", image.info)
        self.assertEqual(photo["derivative_key"], f"blog-images/{self.batch}/v1-{photo['source_sha256']}.jpg")
        self.assertTrue((self.workspace / photo["local_preview"]).is_file())

    def test_prepare_is_deterministic_and_refuses_local_overwrite(self):
        self.write_jpeg("camera.jpg")
        first = pipeline.prepare_local(self.input, self.workspace, self.batch)
        output = self.workspace / first["photos"][0]["local_derivative"]
        digest = hashlib.sha256(output.read_bytes()).hexdigest()

        second = pipeline.prepare_local(self.input, self.tmp / "second", self.batch)
        second_output = self.tmp / "second" / second["photos"][0]["local_derivative"]
        self.assertEqual(digest, hashlib.sha256(second_output.read_bytes()).hexdigest())

        repeated = pipeline.prepare_local(self.input, self.workspace, self.batch)
        self.assertEqual(first, repeated)
        self.assertEqual(digest, hashlib.sha256(output.read_bytes()).hexdigest())

    def test_prepare_recovers_matching_partial_artifacts_and_binds_batch(self):
        self.write_jpeg("camera.jpg")
        first = pipeline.prepare_local(self.input, self.workspace, self.batch)
        (self.workspace / "manifest.json").unlink()
        self.assertEqual(first, pipeline.prepare_local(self.input, self.workspace, self.batch))
        before = sorted(str(path) for path in self.workspace.rglob("*"))
        with self.assertRaises(pipeline.PipelineError):
            pipeline.prepare_local(self.input, self.workspace, "other-batch")
        self.assertEqual(before, sorted(str(path) for path in self.workspace.rglob("*")))

    def test_prepare_enforces_aggregate_and_directory_limits(self):
        data = jpeg_bytes()
        self.write_jpeg("camera.jpg", data)
        with patch.object(pipeline, "MAX_BATCH_BYTES", len(data) - 1):
            with self.assertRaisesRegex(pipeline.PipelineError, "batch"):
                pipeline.prepare_local(self.input, self.workspace, self.batch)
        for name in ("empty-a", "empty-b", "empty-c"):
            (self.input / name).mkdir()
        with patch.object(pipeline, "MAX_LOCAL_ENTRIES", 2):
            with self.assertRaisesRegex(pipeline.PipelineError, "traversal"):
                pipeline.prepare_local(self.input, self.workspace, self.batch)

    def test_derivative_is_resized_and_dimensions_follow_orientation(self):
        self.write_jpeg("portrait.jpg", jpeg_bytes((3000, 1500), orientation=6))
        manifest = pipeline.prepare_local(self.input, self.workspace, self.batch)
        photo = manifest["photos"][0]
        with Image.open(self.workspace / photo["local_derivative"]) as image:
            self.assertLessEqual(max(image.size), 2400)
            self.assertEqual((photo["width"], photo["height"]), image.size)
            self.assertGreater(image.height, image.width)

    def test_prepare_uses_one_bounded_snapshot_per_source(self):
        self.write_jpeg("camera.jpg")
        original_open = Path.open
        reads = []
        def tracked_open(path, *args, **kwargs):
            if path.resolve() == (self.input / "camera.jpg").resolve() and (args[0] if args else kwargs.get("mode")) == "rb":
                reads.append(path)
            return original_open(path, *args, **kwargs)
        with patch.object(Path, "open", tracked_open):
            pipeline.prepare_local(self.input, self.workspace, self.batch)
        self.assertEqual(len(reads), 1)

    def test_oss_ignores_empty_folder_markers(self):
        bucket = FakeBucket({"travel/test-batch/": b"", "travel/test-batch/nested/": b"", "travel/test-batch/a.jpg": jpeg_bytes()})
        manifest = pipeline.prepare_oss(bucket, self.workspace, self.batch, approve_remote_read=True)
        self.assertEqual(len(manifest["photos"]), 1)
        self.assertEqual(bucket.get_calls, ["travel/test-batch/a.jpg"])

    def test_missing_credentials_fail_without_network(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(pipeline.PipelineError, "missing OSS credentials"):
                pipeline._oss_bucket_from_environment()

    def test_prepare_rejects_raw_and_leaves_no_partial_outputs(self):
        self.write_jpeg("valid.jpg")
        (self.input / "camera.CR2").write_bytes(b"not a raw fixture")

        with self.assertRaisesRegex(pipeline.PipelineError, "RAW"):
            pipeline.prepare_local(self.input, self.workspace, self.batch)

        self.assertFalse((self.workspace / "derivatives").exists())

    def test_prepare_rejects_duplicate_content_before_writing_outputs(self):
        data = jpeg_bytes()
        self.write_jpeg("one.jpg", data)
        self.write_jpeg("two.jpg", data)

        with self.assertRaisesRegex(pipeline.PipelineError, "duplicate source"):
            pipeline.prepare_local(self.input, self.workspace, self.batch)

        self.assertFalse((self.workspace / "derivatives").exists())

    def test_prepare_accepts_a_valid_jpeg_larger_than_twenty_mebibytes(self):
        source = self.input / "camera-original.jpg"
        size = (5000, 4000)
        image = Image.frombytes("RGB", size, os.urandom(size[0] * size[1] * 3))
        image.save(source, format="JPEG", quality=95, subsampling=0)
        self.assertGreater(source.stat().st_size, 20 * 1024 * 1024)
        self.assertLessEqual(source.stat().st_size, pipeline.MAX_SOURCE_BYTES)

        manifest = pipeline.prepare_local(self.input, self.workspace, self.batch)
        self.assertTrue((self.workspace / manifest["photos"][0]["local_derivative"]).is_file())

    def test_prepare_rejects_over_per_file_limit_before_decoding(self):
        source = self.input / "overlimit.jpg"
        source.write_bytes(jpeg_bytes())
        with source.open("r+b") as output:
            output.truncate(pipeline.MAX_SOURCE_BYTES + 1)

        with self.assertRaisesRegex(pipeline.PipelineError, "maximum"):
            pipeline.prepare_local(self.input, self.workspace, self.batch)

    def test_prepare_enforces_count_bound(self):
        for index in range(pipeline.MAX_PHOTO_COUNT + 1):
            self.write_jpeg(f"{index:03d}.jpg")

        with self.assertRaisesRegex(pipeline.PipelineError, "count"):
            pipeline.prepare_local(self.input, self.workspace, self.batch)

    def test_prepare_rejects_symlink_and_traversal_batch(self):
        self.write_jpeg("camera.jpg")
        linked = self.input / "linked.jpg"
        try:
            os.symlink(self.input / "camera.jpg", linked)
        except OSError:
            self.skipTest("symlink creation unavailable in this environment")

        with self.assertRaisesRegex(pipeline.PipelineError, "symlink"):
            pipeline.prepare_local(self.input, self.workspace, self.batch)
        with self.assertRaisesRegex(pipeline.PipelineError, "batch"):
            pipeline.validate_batch("../escape")

    def test_prepare_rejects_excess_pixels_and_multiple_pages(self):
        self.write_jpeg("camera.jpg")

        class TooLargeImage:
            format = "JPEG"
            size = (pipeline.MAX_PIXELS + 1, 1)
            n_frames = 1

            def verify(self):
                return None

            def close(self):
                return None

        with patch.object(pipeline.Image, "open", return_value=TooLargeImage()):
            with self.assertRaisesRegex(pipeline.PipelineError, "pixel"):
                pipeline.inspect_jpeg(self.input / "camera.jpg")

        class MultiPageImage(TooLargeImage):
            size = (1, 1)
            n_frames = pipeline.MAX_IMAGE_PAGES + 1

        with patch.object(pipeline.Image, "open", return_value=MultiPageImage()):
            with self.assertRaisesRegex(pipeline.PipelineError, "page"):
                pipeline.inspect_jpeg(self.input / "camera.jpg")

    def test_oss_download_paginates_and_only_reads_exact_travel_prefix(self):
        bucket = FakeBucket(
            {
                "travel/test-batch/a.jpg": jpeg_bytes(),
                "travel/test-batch/b.jpg": jpeg_bytes((12, 8)),
                "travel/other/c.jpg": jpeg_bytes(),
            }
        )

        with self.assertRaises(pipeline.AuthorizationError):
            pipeline.prepare_oss(bucket, self.workspace, self.batch)
        manifest = pipeline.prepare_oss(bucket, self.workspace, self.batch, approve_remote_read=True)

        self.assertEqual(len(manifest["photos"]), 2)
        self.assertEqual(bucket.list_calls, [None, "1"])
        self.assertTrue(all(photo["source_key"].startswith("travel/test-batch/") for photo in manifest["photos"]))

    def test_oss_stops_at_count_limit_before_downloading_the_batch(self):
        bucket = FakeBucket({f"travel/test-batch/{index:03d}.jpg": jpeg_bytes() for index in range(pipeline.MAX_PHOTO_COUNT + 1)})

        with self.assertRaisesRegex(pipeline.PipelineError, "count"):
            pipeline.prepare_oss(bucket, self.workspace, self.batch, approve_remote_read=True)

        self.assertEqual(len(bucket.list_calls), pipeline.MAX_PHOTO_COUNT + 1)
        self.assertEqual(bucket.get_calls, [])

    def test_upload_is_approved_only_and_uses_non_overwrite_header(self):
        self.write_jpeg("camera.jpg")
        manifest = pipeline.prepare_local(self.input, self.workspace, self.batch)
        bucket = FakeBucket()

        with self.assertRaisesRegex(pipeline.AuthorizationError, "approve-publish-photo"):
            pipeline.upload_derivatives(bucket, self.workspace, manifest, approve_upload=True, approve_publish_photo=False)

        pipeline.upload_derivatives(bucket, self.workspace, manifest, approve_remote_read=True, approve_upload=True, approve_publish_photo=True)
        key, data, headers = bucket.puts[0]
        self.assertEqual(key, manifest["photos"][0]["derivative_key"])
        self.assertEqual(headers, {"x-oss-forbid-overwrite": "true"})
        self.assertEqual(data, (self.workspace / manifest["photos"][0]["local_derivative"]).read_bytes())

    def test_upload_recovers_idempotently_and_rejects_different_existing_object(self):
        self.write_jpeg("camera.jpg")
        manifest = pipeline.prepare_local(self.input, self.workspace, self.batch)
        photo = manifest["photos"][0]
        derivative = (self.workspace / photo["local_derivative"]).read_bytes()
        bucket = FakeBucket({photo["derivative_key"]: derivative})

        result = pipeline.upload_derivatives(bucket, self.workspace, manifest, approve_remote_read=True, approve_upload=True, approve_publish_photo=True)
        self.assertEqual(result["skipped_existing"], [photo["derivative_key"]])
        self.assertEqual(bucket.puts, [])

        bucket.objects[photo["derivative_key"]] = FakeObject(photo["derivative_key"], b"different")
        with self.assertRaisesRegex(pipeline.PipelineError, "different content"):
            pipeline.upload_derivatives(bucket, self.workspace, manifest, approve_remote_read=True, approve_upload=True, approve_publish_photo=True)

    def test_draft_requires_observations_and_uses_stable_hosted_urls(self):
        self.write_jpeg("camera.jpg")
        manifest = pipeline.prepare_local(self.input, self.workspace, self.batch)
        observations = {
            "batch": self.batch,
            "photos": [
                {
                    "source_sha256": manifest["photos"][0]["source_sha256"],
                    "derivative_sha256": manifest["photos"][0]["derivative_sha256"],
                    "alt": "画面中可见的蓝色矩形区域",
                    "caption": "蓝色区域",
                    "observation": "可见蓝色矩形区域。",
                }
            ],
        }
        metadata = {
            "article_id": "test-trip",
            "title": "测试旅行",
            "date": "2026-09-15",
            "location": "公开城市级地点",
            "coordinates": {"lat": 30.0, "lng": 120.0},
            "description": "基于已核验画面整理的测试记录。",
            "tags": ["摄影"],
        }

        draft = pipeline.render_draft(manifest, observations, metadata)
        self.assertIn("https://figure-b.ricardolsw.com/blog-images/test-batch/", draft)
        self.assertNotIn("?", draft)
        self.assertIn("draft: true", draft)
        self.assertNotIn("../../assets", draft)

        observations["photos"][0]["caption"] = ""
        with self.assertRaisesRegex(pipeline.PipelineError, "caption"):
            pipeline.render_draft(manifest, observations, metadata)
        observations["photos"][0]["caption"] = "蓝色区域"
        tampered = json.loads(json.dumps(manifest))
        tampered["photos"][0]["derivative_key"] = "blog-images/other-batch/v1-" + tampered["photos"][0]["source_sha256"] + ".jpg"
        with self.assertRaisesRegex(pipeline.PipelineError, "derivative_key"):
            pipeline.render_draft(tampered, observations, metadata)
        metadata["date"] = "2026-09-15\ncover: injected"
        with self.assertRaisesRegex(pipeline.PipelineError, "date"):
            pipeline.render_draft(manifest, observations, metadata)

    def test_private_draft_and_article_staging_are_idempotent_and_protect_human_edits(self):
        self.write_jpeg("camera.jpg")
        manifest = pipeline.prepare_local(self.input, self.workspace, self.batch)
        observations = {"batch": self.batch, "photos": [{
            "source_sha256": manifest["photos"][0]["source_sha256"],
            "derivative_sha256": manifest["photos"][0]["derivative_sha256"],
            "alt": "可见的蓝色区域",
            "caption": "蓝色区域",
            "observation": "可见蓝色区域。",
        }]}
        metadata = {
            "article_id": "test-trip",
            "title": "测试旅行",
            "date": "2026-09-15",
            "location": "公开城市级地点",
            "coordinates": {"lat": 30.0, "lng": 120.0},
            "description": "基于已核验画面整理的测试记录。",
            "tags": ["摄影"],
        }
        draft_path = pipeline.write_draft(self.workspace, manifest, observations, metadata)
        self.assertTrue(draft_path.is_file())
        self.assertEqual(draft_path, pipeline.write_draft(self.workspace, manifest, observations, metadata))

        repo = self.tmp / "repo"
        (repo / "src" / "content" / "travel").mkdir(parents=True)
        with self.assertRaises(pipeline.AuthorizationError):
            pipeline.stage_article(repo, self.workspace, manifest, observations, metadata, approve_publish_article=False)
        article = pipeline.stage_article(repo, self.workspace, manifest, observations, metadata, approve_publish_article=True)
        self.assertTrue(article.is_file())
        self.assertEqual(article, pipeline.stage_article(repo, self.workspace, manifest, observations, metadata, approve_publish_article=True))
        article.write_text(article.read_text(encoding="utf-8") + "人工编辑\n", encoding="utf-8")
        with self.assertRaisesRegex(pipeline.PipelineError, "human edits"):
            pipeline.stage_article(repo, self.workspace, manifest, observations, metadata, approve_publish_article=True)


if __name__ == "__main__":
    unittest.main()
