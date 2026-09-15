#!/usr/bin/env python3
"""Safe, approval-gated preparation and OSS delivery for travel JPEGs.

No command performs an OSS request unless its matching approval flag is present.
Raw input, manifests, previews, and drafts belong in the ignored workspace, never
inside the Astro publish tree.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
import re
import shutil
import sys
import tempfile
from datetime import date
from io import BytesIO
from pathlib import Path, PurePosixPath
from typing import Any, Iterable

from PIL import Image, ImageOps, UnidentifiedImageError

OSS_ENDPOINT = "https://oss-cn-shanghai.aliyuncs.com"
OSS_BUCKET_NAME = "figure-b"
PUBLIC_IMAGE_BASE_URL = "https://figure-b.ricardolsw.com"
MAX_SOURCE_BYTES = 128 * 1024 * 1024
MAX_BATCH_BYTES = 512 * 1024 * 1024
MAX_PHOTO_COUNT = 100
MAX_LOCAL_ENTRIES = 1_000
MAX_OSS_PAGES = 200
MAX_PIXELS = 40_000_000
MAX_IMAGE_PAGES = 1
DERIVATIVE_LONG_EDGE = 2400
PREVIEW_LONG_EDGE = 768
JPEG_QUALITY = 86
SOURCE_BATCH_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9-]{0,79}$")
ARTICLE_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{0,79}$")
RAW_EXTENSIONS = {".arw", ".cr2", ".cr3", ".dng", ".nef", ".orf", ".raf", ".rw2"}
JPEG_EXTENSIONS = {".jpg", ".jpeg"}


class PipelineError(RuntimeError):
    """A safe-to-display validation or workflow error."""


class AuthorizationError(PipelineError):
    """The caller did not supply an independent required approval."""


class ObjectNotFoundError(RuntimeError):
    """Test-double equivalent of an OSS 404."""


class ObjectAlreadyExistsError(RuntimeError):
    """Test-double equivalent of OSS refusing an overwrite."""


def validate_batch(batch: str) -> str:
    """Validate a case-sensitive source batch without normalizing its spelling."""
    if not SOURCE_BATCH_PATTERN.fullmatch(batch):
        raise PipelineError("batch must be an ASCII slug (letters, digits, hyphens) with no path separators")
    return batch


def validate_article_id(article_id: str) -> str:
    """Keep article filenames lowercase so they remain safe on Windows filesystems."""
    if not ARTICLE_ID_PATTERN.fullmatch(article_id):
        raise PipelineError("article_id must be a lowercase slug (letters, digits, hyphens) with no path separators")
    return article_id


def storage_batch(batch: str) -> str:
    """Map case-sensitive source batches to an injective Windows-safe public namespace."""
    source_batch = validate_batch(batch)
    if source_batch == source_batch.lower():
        return source_batch
    # `~` is not permitted in source batches, so the encoded namespace cannot
    # collide with any existing all-lowercase batch. Hex preserves every byte.
    return f"{source_batch.lower()}~{source_batch.encode('ascii').hex()}"


def source_prefix(batch: str) -> str:
    return f"travel/{validate_batch(batch)}/"


def derivative_prefix(batch: str) -> str:
    return f"blog-images/{storage_batch(batch)}/"


def derivative_key(batch: str, source_digest: str) -> str:
    return f"{derivative_prefix(batch)}v1-{source_digest}.jpg"


def hosted_url(key: str) -> str:
    if not key.startswith("blog-images/") or not key.endswith(".jpg") or "?" in key:
        raise PipelineError("only canonical blog-images JPEG keys can become hosted URLs")
    return f"{PUBLIC_IMAGE_BASE_URL}/{key}"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _safe_child(root: Path, relative: str) -> Path:
    target = (root / relative).resolve()
    try:
        target.relative_to(root.resolve())
    except ValueError as error:
        raise PipelineError("path escapes its approved workspace") from error
    return target


def _is_valid_oss_key(key: str, prefix: str) -> bool:
    if not key.startswith(prefix) or key == prefix or "\\" in key:
        return False
    parts = PurePosixPath(key).parts
    return all(part not in {"", ".", ".."} for part in parts)


def _read_limited(stream: Any, maximum: int, label: str) -> bytes:
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = stream.read(min(64 * 1024, maximum - total + 1))
        if not chunk:
            break
        total += len(chunk)
        if total > maximum:
            raise PipelineError(f"{label} exceeds the {maximum} byte maximum")
        chunks.append(chunk)
    return b"".join(chunks)


def inspect_jpeg(path: Path, raw: bytes | None = None) -> tuple[int, int]:
    """Verify JPEG type and decode constraints before any derivative is written."""
    if path.suffix.lower() in RAW_EXTENSIONS:
        raise PipelineError(f"RAW input is not supported in v1: {path.name}")
    if path.suffix.lower() not in JPEG_EXTENSIONS:
        raise PipelineError(f"only JPEG input is supported in v1: {path.name}")
    try:
        image = Image.open(BytesIO(raw) if raw is not None else path)
        try:
            if image.format != "JPEG":
                raise PipelineError(f"file extension does not contain a JPEG: {path.name}")
            width, height = image.size
            if width * height > MAX_PIXELS:
                raise PipelineError(f"image exceeds the {MAX_PIXELS} pixel maximum: {path.name}")
            if getattr(image, "n_frames", 1) > MAX_IMAGE_PAGES:
                raise PipelineError(f"image exceeds the {MAX_IMAGE_PAGES} page maximum: {path.name}")
            image.verify()
            return width, height
        finally:
            image.close()
    except (UnidentifiedImageError, OSError) as error:
        raise PipelineError(f"invalid JPEG input: {path.name}") from error


def _list_local_jpegs(input_directory: Path) -> list[Path]:
    if input_directory.is_symlink():
        raise PipelineError("local input must be a real directory, not a symlink")
    input_directory = input_directory.resolve()
    if not input_directory.is_dir():
        raise PipelineError("local input must be a real directory, not a symlink")
    photos: list[Path] = []
    entry_count = 0
    for candidate in input_directory.rglob("*"):
        entry_count += 1
        if entry_count > MAX_LOCAL_ENTRIES:
            raise PipelineError(f"local traversal exceeds the {MAX_LOCAL_ENTRIES} entry maximum")
        if candidate.is_symlink():
            raise PipelineError(f"symlink input is not allowed: {candidate.name}")
        if candidate.is_file():
            photos.append(candidate)
            if len(photos) > MAX_PHOTO_COUNT:
                raise PipelineError(f"photo count exceeds the {MAX_PHOTO_COUNT} maximum")
    photos.sort()
    if not photos:
        raise PipelineError("no photos were found")
    if len(photos) > MAX_PHOTO_COUNT:
        raise PipelineError(f"photo count exceeds the {MAX_PHOTO_COUNT} maximum")
    total_bytes = 0
    for photo in photos:
        size = photo.stat().st_size
        if size > MAX_SOURCE_BYTES:
            raise PipelineError(f"source photo exceeds the {MAX_SOURCE_BYTES} byte maximum: {photo.name}")
        total_bytes += size
        if total_bytes > MAX_BATCH_BYTES:
            raise PipelineError(f"batch exceeds the {MAX_BATCH_BYTES} byte maximum")
        inspect_jpeg(photo)
    return photos


def _encode_derivative(raw: bytes, source_name: str) -> tuple[bytes, bytes, int, int]:
    try:
        with Image.open(BytesIO(raw)) as opened:
            if opened.format != "JPEG":
                raise PipelineError("file extension does not contain a JPEG")
            width, height = opened.size
            if width * height > MAX_PIXELS or getattr(opened, "n_frames", 1) > MAX_IMAGE_PAGES:
                raise PipelineError("JPEG exceeds pixel or page limits")
            transposed = ImageOps.exif_transpose(opened)
            rgb = transposed.convert("RGB")
            rgb.thumbnail((DERIVATIVE_LONG_EDGE, DERIVATIVE_LONG_EDGE), Image.Resampling.LANCZOS)
            width, height = rgb.size
            output = BytesIO()
            # Intentionally omit exif, xmp, icc_profile, and comment: metadata must not survive.
            rgb.save(output, format="JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
            preview = rgb.copy()
            preview.thumbnail((PREVIEW_LONG_EDGE, PREVIEW_LONG_EDGE))
            preview_output = BytesIO()
            preview.save(preview_output, format="JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
            derivative = output.getvalue()
            preview_bytes = preview_output.getvalue()
            if len(derivative) > MAX_SOURCE_BYTES or len(preview_bytes) > MAX_SOURCE_BYTES:
                raise PipelineError(f"sanitized JPEG exceeds the {MAX_SOURCE_BYTES} byte maximum: {source_name}")
            return derivative, preview_bytes, width, height
    except (UnidentifiedImageError, OSError) as error:
        raise PipelineError("could not create sanitized JPEG") from error


def _existing_immutable_file_matches(path: Path, data: bytes) -> bool:
    """Read an existing immutable target without following unsafe replacement types."""
    if path.is_symlink() or not path.is_file():
        raise PipelineError(f"refusing unsafe existing path: {path}")
    try:
        existing = path.read_bytes()
    except OSError as error:
        raise PipelineError(f"could not read existing immutable file: {path}") from error
    if existing == data:
        return True
    raise PipelineError(f"refusing to overwrite existing file with different content: {path}")


def _write_immutable(path: Path, data: bytes) -> bool:
    """Publish complete bytes once; matching existing content is an idempotent success."""
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary: Path | None = None
    try:
        descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
        temporary = Path(temporary_name)
        try:
            output = os.fdopen(descriptor, "wb")
        except Exception:
            os.close(descriptor)
            raise
        with output:
            output.write(data)
            output.flush()
            os.fsync(output.fileno())
        try:
            os.link(temporary, path)
        except FileExistsError:
            _existing_immutable_file_matches(path, data)
            return False
        return True
    except PipelineError:
        raise
    except OSError as error:
        raise PipelineError(f"could not immutably write file: {path}") from error
    finally:
        if temporary is not None:
            try:
                temporary.unlink()
            except FileNotFoundError:
                pass


def _workspace_file(workspace: Path, name: str) -> Path:
    return _safe_child(workspace, name)


def _manifest_path(workspace: Path) -> Path:
    return _workspace_file(workspace, "manifest.json")


def _write_manifest(workspace: Path, manifest: dict[str, Any]) -> None:
    data = (json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")
    _write_immutable(_manifest_path(workspace), data)


def _bind_workspace_batch(workspace: Path, batch: str) -> None:
    _write_immutable(_workspace_file(workspace, "batch.json"), (json.dumps({"batch": validate_batch(batch)}, sort_keys=True) + "\n").encode("utf-8"))


def validate_manifest(manifest: dict[str, Any], workspace: Path | None = None, *, verify_derivatives: bool = False) -> None:
    batch = validate_batch(str(manifest.get("batch", "")))
    if manifest.get("version") != 1 or not isinstance(manifest.get("photos"), list) or not manifest["photos"]:
        raise PipelineError("manifest must be a non-empty v1 photo list")
    if len(manifest["photos"]) > MAX_PHOTO_COUNT:
        raise PipelineError("manifest photo count exceeds the maximum")
    source_digests: set[str] = set()
    for photo in manifest["photos"]:
        if not isinstance(photo, dict):
            raise PipelineError("manifest photo rows must be objects")
        source_digest = photo.get("source_sha256")
        derivative_digest = photo.get("derivative_sha256")
        if not isinstance(source_digest, str) or not re.fullmatch(r"[a-f0-9]{64}", source_digest):
            raise PipelineError("manifest has an invalid source_sha256")
        if not isinstance(derivative_digest, str) or not re.fullmatch(r"[a-f0-9]{64}", derivative_digest):
            raise PipelineError("manifest has an invalid derivative_sha256")
        if source_digest in source_digests:
            raise PipelineError("manifest has duplicate source_sha256 rows")
        source_digests.add(source_digest)
        key = derivative_key(batch, source_digest)
        if photo.get("derivative_key") != key:
            raise PipelineError("manifest derivative_key does not match batch and source digest")
        if photo.get("local_derivative") != f"derivatives/{key}" or photo.get("local_preview") != f"previews/{source_digest}.jpg":
            raise PipelineError("manifest has an invalid local artifact path")
        if not isinstance(photo.get("source_key"), str) or not photo["source_key"]:
            raise PipelineError("manifest has an invalid source_key")
        width, height = photo.get("width"), photo.get("height")
        if not isinstance(width, int) or not isinstance(height, int) or width < 1 or height < 1 or width * height > MAX_PIXELS:
            raise PipelineError("manifest has invalid image dimensions")
        if workspace is not None:
            derivative = _workspace_file(workspace.resolve(), str(photo["local_derivative"]))
            preview = _workspace_file(workspace.resolve(), str(photo["local_preview"]))
            if derivative.is_symlink() or preview.is_symlink() or not derivative.is_file() or not preview.is_file():
                raise PipelineError("manifest references missing or unsafe local artifacts")
            if verify_derivatives and sha256_bytes(derivative.read_bytes()) != derivative_digest:
                raise PipelineError("local derivative does not match the manifest digest")


def _prepare_sources(sources: Iterable[tuple[str, Path]], workspace: Path, batch: str) -> dict[str, Any]:
    batch = validate_batch(batch)
    workspace = workspace.resolve()
    source_items = list(sources)
    if not source_items:
        raise PipelineError("no photos were found")
    if len(source_items) > MAX_PHOTO_COUNT:
        raise PipelineError(f"photo count exceeds the {MAX_PHOTO_COUNT} maximum")

    # Validate every source and deterministic destination before creating any derivative.
    # Duplicate bytes would otherwise target the same immutable versioned key.
    source_digests: set[str] = set()
    source_snapshot: list[tuple[str, str]] = []
    snapshots: list[tuple[str, str, bytes, str]] = []
    total_bytes = 0
    for source_key, source in source_items:
        with source.open("rb") as stream:
            raw = _read_limited(stream, min(MAX_SOURCE_BYTES, MAX_BATCH_BYTES - total_bytes), "source photo")
        total_bytes += len(raw)
        inspect_jpeg(source, raw)
        source_digest = sha256_bytes(raw)
        if source_digest in source_digests:
            raise PipelineError("duplicate source content would reuse an immutable derivative key")
        source_digests.add(source_digest)
        source_snapshot.append((source_key, source_digest))
        snapshots.append((source_key, source.name, raw, source_digest))

    _bind_workspace_batch(workspace, batch)
    manifest_path = _manifest_path(workspace)
    if manifest_path.exists():
        try:
            existing_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as error:
            raise PipelineError("existing manifest is not valid JSON") from error
        if not isinstance(existing_manifest, dict):
            raise PipelineError("existing manifest is not an object")
        validate_manifest(existing_manifest, workspace, verify_derivatives=True)
        existing_snapshot = [(str(photo["source_key"]), str(photo["source_sha256"])) for photo in existing_manifest["photos"]]
        if existing_snapshot != source_snapshot:
            raise PipelineError("workspace already contains a different batch snapshot; choose a new workspace")

    photos: list[dict[str, Any]] = []
    for source_key, source_name, raw, source_digest in snapshots:
        derivative, preview, width, height = _encode_derivative(raw, source_name)
        key = derivative_key(batch, source_digest)
        local_derivative = f"derivatives/{key}"
        local_preview = f"previews/{source_digest}.jpg"
        _write_immutable(_workspace_file(workspace, local_derivative), derivative)
        _write_immutable(_workspace_file(workspace, local_preview), preview)
        photos.append(
            {
                "source_key": source_key,
                "source_sha256": source_digest,
                "derivative_key": key,
                "derivative_sha256": sha256_bytes(derivative),
                "local_derivative": local_derivative.replace("\\", "/"),
                "local_preview": local_preview.replace("\\", "/"),
                "width": width,
                "height": height,
            }
        )
    manifest = {"version": 1, "batch": batch, "photos": photos}
    _write_manifest(workspace, manifest)
    return manifest


def prepare_local(input_directory: Path, workspace: Path, batch: str) -> dict[str, Any]:
    """Prepare a local JPEG directory; source paths are never modified or deleted."""
    photos = _list_local_jpegs(input_directory)
    return _prepare_sources(((photo.relative_to(input_directory.resolve()).as_posix(), photo) for photo in photos), workspace, batch)


def _raise_redacted_oss_error(stage: str, error: Exception) -> None:
    """Convert SDK failures to safe display errors without exposing request details."""
    if getattr(error, "status", None) == 403:
        raise PipelineError(f"OSS {stage} was forbidden (HTTP 403); request details are redacted") from None
    raise PipelineError(f"OSS {stage} failed") from error


def _oss_list(bucket: Any, prefix: str) -> Iterable[Any]:
    token: str | None = None
    pages = 0
    while True:
        pages += 1
        if pages > MAX_OSS_PAGES:
            raise PipelineError("OSS pagination exceeds the page maximum")
        try:
            if hasattr(bucket, "list_objects_v2"):
                result = bucket.list_objects_v2(prefix=prefix, continuation_token=token or "")
            else:  # Test doubles and older SDKs.
                result = bucket.list_objects(prefix=prefix, continuation_token=token)
        except Exception as error:
            _raise_redacted_oss_error("list", error)
        for item in getattr(result, "object_list", []):
            yield item
        token = getattr(result, "next_continuation_token", None)
        if not getattr(result, "is_truncated", False):
            return
        if not token:
            raise PipelineError("OSS pagination was truncated without a continuation token")


def prepare_oss(bucket: Any, workspace: Path, batch: str, *, approve_remote_read: bool = False) -> dict[str, Any]:
    """List and download only exact travel/<batch>/ objects after explicit authorization."""
    if not approve_remote_read:
        raise AuthorizationError("OSS preparation requires --approve-remote-read")
    batch = validate_batch(batch)
    prefix = source_prefix(batch)
    listed: list[Any] = []
    for item in _oss_list(bucket, prefix):
        key = str(getattr(item, "key", ""))
        if key.startswith(prefix) and key.endswith("/") and getattr(item, "size", -1) == 0:
            continue
        listed.append(item)
        if len(listed) > MAX_PHOTO_COUNT:
            raise PipelineError(f"photo count exceeds the {MAX_PHOTO_COUNT} maximum")
    if not listed:
        raise PipelineError("no OSS photos were found under the exact batch prefix")
    raw_dir = _workspace_file(workspace.resolve(), "raw")
    sources: list[tuple[str, Path]] = []
    listed_total_bytes = 0
    downloaded_total_bytes = 0
    try:
        for item in listed:
            key = str(getattr(item, "key", ""))
            size = int(getattr(item, "size", 0))
            if not _is_valid_oss_key(key, prefix):
                raise PipelineError("OSS returned a key outside the exact travel batch prefix")
            if size > MAX_SOURCE_BYTES:
                raise PipelineError(f"source photo exceeds the {MAX_SOURCE_BYTES} byte maximum")
            listed_total_bytes += size
            if listed_total_bytes > MAX_BATCH_BYTES:
                raise PipelineError(f"batch exceeds the {MAX_BATCH_BYTES} byte maximum")
            suffix = Path(key).suffix.lower()
            if suffix in RAW_EXTENSIONS:
                raise PipelineError("RAW input is not supported in v1")
            if suffix not in JPEG_EXTENSIONS:
                raise PipelineError("only JPEG input is supported in v1")
            try:
                data = _read_limited(bucket.get_object(key), MAX_SOURCE_BYTES, "source photo")
            except PipelineError:
                raise
            except Exception as error:
                _raise_redacted_oss_error("source download", error)
            downloaded_total_bytes += len(data)
            if downloaded_total_bytes > MAX_BATCH_BYTES:
                raise PipelineError(f"batch exceeds the {MAX_BATCH_BYTES} byte maximum")
            destination = _safe_child(raw_dir, f"{sha256_bytes(key.encode('utf-8'))}{suffix}")
            _write_immutable(destination, data)
            sources.append((key, destination))
        return _prepare_sources(sources, workspace, batch)
    except Exception:
        shutil.rmtree(raw_dir, ignore_errors=True)
        raise


ETAG_PATTERN = re.compile(r"^[A-Fa-f0-9]{32}(?:-[1-9][0-9]*)?$")
INCREMENTAL_PLAN_NAME = "incremental-plan.json"
INCREMENTAL_ROUNDS_DIRECTORY = "incremental-rounds"
INCREMENTAL_PROGRESS_DIRECTORY = "incremental-progress"


def _normalize_etag(value: Any, error_message: str) -> str:
    """Accept an optional RFC entity-tag wrapper without changing opaque tag bytes."""
    etag = str(value)
    if etag.startswith('"') or etag.endswith('"'):
        if len(etag) < 2 or not (etag.startswith('"') and etag.endswith('"')):
            raise PipelineError(error_message)
        etag = etag[1:-1]
    # The restricted OSS form excludes whitespace/control characters and header injection.
    if not ETAG_PATTERN.fullmatch(etag):
        raise PipelineError(error_message)
    return etag


def _source_etag(item: Any) -> str:
    """Accept only normal OSS entity tags that are safe to send in If-Match."""
    return _normalize_etag(getattr(item, "etag", ""), "OSS source is missing a valid ETag; incremental preparation cannot continue")


def _if_match_header(etag: str) -> str:
    """Format a validated opaque ETag as an RFC strong entity-tag."""
    return f'"{_normalize_etag(etag, "incremental plan has an invalid source ETag")}"'


def _snapshot_oss_sources(bucket: Any, batch: str) -> list[dict[str, Any]]:
    """Capture the exact, case-sensitive OSS inventory without downloading objects."""
    prefix = source_prefix(batch)
    sources: list[dict[str, Any]] = []
    keys: set[str] = set()
    for item in _oss_list(bucket, prefix):
        key = str(getattr(item, "key", ""))
        try:
            size = int(getattr(item, "size", -1))
        except (TypeError, ValueError) as error:
            raise PipelineError("OSS source has an invalid size") from error
        if key.startswith(prefix) and key.endswith("/") and size == 0:
            continue
        if not _is_valid_oss_key(key, prefix):
            raise PipelineError("OSS returned a key outside the exact travel batch prefix")
        if key in keys:
            raise PipelineError("OSS listing contains duplicate source keys")
        keys.add(key)
        if len(keys) > MAX_PHOTO_COUNT:
            raise PipelineError(f"photo count exceeds the {MAX_PHOTO_COUNT} maximum")
        if size < 1 or size > MAX_SOURCE_BYTES or size > MAX_BATCH_BYTES:
            raise PipelineError(f"source photo exceeds the {MAX_SOURCE_BYTES} byte maximum")
        suffix = Path(key).suffix.lower()
        if suffix in RAW_EXTENSIONS:
            raise PipelineError("RAW input is not supported in v1")
        if suffix not in JPEG_EXTENSIONS:
            raise PipelineError("only JPEG input is supported in v1")
        sources.append({"key": key, "size": size, "etag": _source_etag(item)})
    if not sources:
        raise PipelineError("no OSS photos were found under the exact batch prefix")
    return sorted(sources, key=lambda source: str(source["key"]))


def _partition_incremental_sources(sources: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Partition the fixed source inventory in key order without exceeding one round's budget."""
    rounds: list[dict[str, Any]] = []
    current: list[str] = []
    total_bytes = 0
    for source in sources:
        size = int(source["size"])
        if current and total_bytes + size > MAX_BATCH_BYTES:
            rounds.append({"index": len(rounds) + 1, "total_bytes": total_bytes, "sources": current})
            current, total_bytes = [], 0
        current.append(str(source["key"]))
        total_bytes += size
    if current:
        rounds.append({"index": len(rounds) + 1, "total_bytes": total_bytes, "sources": current})
    return rounds


def _incremental_plan_path(workspace: Path) -> Path:
    return _workspace_file(workspace, INCREMENTAL_PLAN_NAME)


def _incremental_round_path(workspace: Path, index: int) -> Path:
    return _workspace_file(workspace, f"{INCREMENTAL_ROUNDS_DIRECTORY}/{index:04d}-manifest.json")


def _incremental_progress_path(workspace: Path, name: str) -> Path:
    return _workspace_file(workspace, f"{INCREMENTAL_PROGRESS_DIRECTORY}/{name}.json")


def _json_bytes(value: dict[str, Any]) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def _validate_incremental_plan(plan: dict[str, Any], batch: str) -> None:
    """Reject altered plans, including any key that is not in this exact source prefix."""
    prefix = source_prefix(batch)
    if plan.get("incremental_plan_version") != 1 or plan.get("batch") != batch or plan.get("source_prefix") != prefix:
        raise PipelineError("incremental plan does not match the requested exact batch")
    sources = plan.get("sources")
    if not isinstance(sources, list) or not sources or len(sources) > MAX_PHOTO_COUNT:
        raise PipelineError("incremental plan has an invalid source inventory")
    normalized: list[dict[str, Any]] = []
    keys: set[str] = set()
    for source in sources:
        if not isinstance(source, dict):
            raise PipelineError("incremental plan has an invalid source inventory")
        key = source.get("key")
        size = source.get("size")
        etag = source.get("etag")
        if not isinstance(key, str) or not _is_valid_oss_key(key, prefix) or key in keys:
            raise PipelineError("incremental plan has an invalid source key")
        if not isinstance(size, int) or size < 1 or size > MAX_SOURCE_BYTES or size > MAX_BATCH_BYTES:
            raise PipelineError("incremental plan has an invalid source size")
        if not isinstance(etag, str):
            raise PipelineError("incremental plan has an invalid source ETag")
        normalized_etag = _normalize_etag(etag, "incremental plan has an invalid source ETag")
        # Retain opaque ETag case while accepting a legacy/hand-written outer wrapper.
        source["etag"] = normalized_etag
        keys.add(key)
        normalized.append({"key": key, "size": size, "etag": normalized_etag})
    if normalized != sorted(normalized, key=lambda source: str(source["key"])):
        raise PipelineError("incremental plan source inventory is not deterministically ordered")
    expected_rounds = _partition_incremental_sources(normalized)
    if plan.get("rounds") != expected_rounds:
        raise PipelineError("incremental plan rounds do not match the fixed source inventory")


def _load_or_create_incremental_plan(workspace: Path, batch: str, snapshot: list[dict[str, Any]]) -> dict[str, Any]:
    """Create once or require the remote inventory to be byte-for-byte identical on resume."""
    path = _incremental_plan_path(workspace)
    if path.exists():
        plan = _load_json(path)
        _validate_incremental_plan(plan, batch)
        if plan["sources"] != snapshot:
            raise PipelineError("OSS source snapshot changed since the incremental plan was created; use a new workspace")
        return plan
    plan = {
        "incremental_plan_version": 1,
        "batch": batch,
        "source_prefix": source_prefix(batch),
        "sources": snapshot,
        "rounds": _partition_incremental_sources(snapshot),
    }
    _validate_incremental_plan(plan, batch)
    _write_immutable(path, _json_bytes(plan))
    return plan


def _validate_incremental_photo(photo: dict[str, Any], expected: dict[str, Any]) -> None:
    if photo.get("source_key") != expected["key"] or photo.get("source_size") != expected["size"] or photo.get("source_etag") != expected["etag"]:
        raise PipelineError("incremental round does not match its fixed source snapshot")
    preview_digest = photo.get("preview_sha256")
    if not isinstance(preview_digest, str) or not re.fullmatch(r"[a-f0-9]{64}", preview_digest):
        raise PipelineError("incremental round has an invalid preview_sha256")


def _validate_incremental_round(
    manifest: dict[str, Any], workspace: Path, batch: str, round_spec: dict[str, Any], sources_by_key: dict[str, dict[str, Any]]
) -> None:
    validate_manifest(manifest, workspace, verify_derivatives=True)
    if manifest.get("batch") != batch or manifest.get("incremental_round") != round_spec["index"]:
        raise PipelineError("incremental round manifest does not match its plan")
    expected_sources = [sources_by_key[key] for key in round_spec["sources"]]
    photos = manifest.get("photos", [])
    if len(photos) != len(expected_sources):
        raise PipelineError("incremental round manifest has an incomplete photo set")
    for photo, expected in zip(photos, expected_sources, strict=True):
        _validate_incremental_photo(photo, expected)
        preview = _workspace_file(workspace, str(photo["local_preview"]))
        if sha256_bytes(preview.read_bytes()) != photo["preview_sha256"]:
            raise PipelineError("local preview does not match the incremental round manifest")


def _download_incremental_source(bucket: Any, source: dict[str, Any]) -> bytes:
    key = str(source["key"])
    expected_size = int(source["size"])
    try:
        data = _read_limited(bucket.get_object(key, headers={"If-Match": _if_match_header(str(source["etag"]))}), expected_size, "source photo")
    except PipelineError:
        raise
    except Exception as error:
        _raise_redacted_oss_error("source download", error)
    if len(data) != expected_size:
        raise PipelineError("downloaded source size does not match the incremental plan")
    return data


def _prepare_incremental_round(
    bucket: Any, workspace: Path, batch: str, round_spec: dict[str, Any], sources_by_key: dict[str, dict[str, Any]], seen_digests: set[str]
) -> dict[str, Any]:
    """Process one fixed-size round one source at a time; raw data never persists locally."""
    photos: list[dict[str, Any]] = []
    round_digests = set(seen_digests)
    for key in round_spec["sources"]:
        source = sources_by_key[key]
        raw = _download_incremental_source(bucket, source)
        source_path = Path(key)
        inspect_jpeg(source_path, raw)
        source_digest = sha256_bytes(raw)
        if source_digest in round_digests:
            raise PipelineError("duplicate source content would reuse an immutable derivative key")
        round_digests.add(source_digest)
        derivative, preview, width, height = _encode_derivative(raw, source_path.name)
        derivative_key_name = derivative_key(batch, source_digest)
        local_derivative = f"derivatives/{derivative_key_name}"
        local_preview = f"previews/{source_digest}.jpg"
        _write_immutable(_workspace_file(workspace, local_derivative), derivative)
        _write_immutable(_workspace_file(workspace, local_preview), preview)
        photos.append(
            {
                "source_key": key,
                "source_size": source["size"],
                "source_etag": source["etag"],
                "source_sha256": source_digest,
                "derivative_key": derivative_key_name,
                "derivative_sha256": sha256_bytes(derivative),
                "preview_sha256": sha256_bytes(preview),
                "local_derivative": local_derivative,
                "local_preview": local_preview,
                "width": width,
                "height": height,
            }
        )
    manifest = {"version": 1, "batch": batch, "incremental_round": round_spec["index"], "photos": photos}
    _validate_incremental_round(manifest, workspace, batch, round_spec, sources_by_key)
    _write_immutable(_incremental_round_path(workspace, int(round_spec["index"])), _json_bytes(manifest))
    _write_immutable(
        _incremental_progress_path(workspace, f"{int(round_spec['index']):04d}-complete"),
        _json_bytes({"round": round_spec["index"], "manifest_sha256": sha256_bytes(_json_bytes(manifest))}),
    )
    return manifest


def _validate_incremental_root(manifest: dict[str, Any], workspace: Path, batch: str, plan: dict[str, Any]) -> None:
    validate_manifest(manifest, workspace, verify_derivatives=True)
    expected_sources = plan["sources"]
    photos = manifest.get("photos", [])
    if manifest.get("batch") != batch or manifest.get("incremental") is not True or len(photos) != len(expected_sources):
        raise PipelineError("root manifest is not the complete incremental batch")
    for photo, expected in zip(photos, expected_sources, strict=True):
        _validate_incremental_photo(photo, expected)
        preview = _workspace_file(workspace, str(photo["local_preview"]))
        if sha256_bytes(preview.read_bytes()) != photo["preview_sha256"]:
            raise PipelineError("local preview does not match the root manifest")


def prepare_oss_incremental(
    bucket: Any, workspace: Path, batch: str, *, approve_remote_read: bool = False, approve_incremental: bool = False
) -> dict[str, Any]:
    """Opt-in OSS preparation that fixes the inventory then safely resumes bounded rounds."""
    if not approve_remote_read:
        raise AuthorizationError("OSS preparation requires --approve-remote-read")
    if not approve_incremental:
        raise AuthorizationError("incremental preparation requires --approve-incremental")
    batch = validate_batch(batch)
    workspace = workspace.resolve()
    snapshot = _snapshot_oss_sources(bucket, batch)
    _bind_workspace_batch(workspace, batch)
    plan = _load_or_create_incremental_plan(workspace, batch, snapshot)
    manifest_path = _manifest_path(workspace)
    if manifest_path.exists():
        root_manifest = _load_json(manifest_path)
        _validate_incremental_root(root_manifest, workspace, batch, plan)
        return root_manifest
    sources_by_key = {str(source["key"]): source for source in plan["sources"]}
    completed_photos: list[dict[str, Any]] = []
    seen_digests: set[str] = set()
    for round_spec in plan["rounds"]:
        round_path = _incremental_round_path(workspace, int(round_spec["index"]))
        if round_path.exists():
            round_manifest = _load_json(round_path)
            _validate_incremental_round(round_manifest, workspace, batch, round_spec, sources_by_key)
        else:
            round_manifest = _prepare_incremental_round(bucket, workspace, batch, round_spec, sources_by_key, seen_digests)
        for photo in round_manifest["photos"]:
            digest = str(photo["source_sha256"])
            if digest in seen_digests:
                raise PipelineError("duplicate source content would reuse an immutable derivative key")
            seen_digests.add(digest)
            completed_photos.append(photo)
    root_manifest = {"version": 1, "batch": batch, "incremental": True, "photos": completed_photos}
    _validate_incremental_root(root_manifest, workspace, batch, plan)
    _write_manifest(workspace, root_manifest)
    _write_immutable(
        _incremental_progress_path(workspace, "complete"),
        _json_bytes({"manifest_sha256": sha256_bytes(_json_bytes(root_manifest)), "round_count": len(plan["rounds"])}),
    )
    return root_manifest


def _is_missing_object(error: Exception) -> bool:
    return getattr(error, "status", None) == 404 or error.__class__.__name__ in {"NoSuchKey", "NoSuchObject"}


def _is_conflict(error: Exception) -> bool:
    return getattr(error, "status", None) in {409, 412} or error.__class__.__name__ in {"ObjectAlreadyExistsError", "ObjectAlreadyExists"}


def _existing_object_matches(bucket: Any, key: str, expected_digest: str) -> bool | None:
    try:
        bucket.get_object_meta(key)
    except Exception as error:
        if _is_missing_object(error):
            return None
        raise PipelineError(f"could not inspect destination object: {key}") from error
    try:
        actual = _read_limited(bucket.get_object(key), MAX_SOURCE_BYTES, key)
    except Exception as error:
        raise PipelineError(f"could not read existing destination object: {key}") from error
    return sha256_bytes(actual) == expected_digest


def upload_derivatives(
    bucket: Any,
    workspace: Path,
    manifest: dict[str, Any],
    *,
    approve_remote_read: bool = False,
    approve_upload: bool = False,
    approve_publish_photo: bool = False,
) -> dict[str, list[str]]:
    """Put immutable derivative keys only; do not delete, overwrite, or change ACLs."""
    if not approve_publish_photo:
        raise AuthorizationError("upload requires --approve-publish-photo")
    if not approve_upload:
        raise AuthorizationError("upload requires --approve-upload")
    if not approve_remote_read:
        raise AuthorizationError("upload preflight requires --approve-remote-read")
    validate_manifest(manifest, workspace, verify_derivatives=True)
    batch = validate_batch(str(manifest.get("batch", "")))
    mapped_batch = storage_batch(batch)
    uploaded: list[str] = []
    skipped_existing: list[str] = []
    for photo in manifest.get("photos", []):
        key = str(photo.get("derivative_key", ""))
        if not key.startswith(derivative_prefix(batch)) or not re.fullmatch(rf"blog-images/{re.escape(mapped_batch)}/v1-[a-f0-9]{{64}}\.jpg", key):
            raise PipelineError("manifest contains an invalid derivative key")
        derivative = _workspace_file(workspace.resolve(), str(photo.get("local_derivative", "")))
        if derivative.is_symlink() or not derivative.is_file():
            raise PipelineError(f"missing safe local derivative: {key}")
        inspect_jpeg(derivative)
        with Image.open(derivative) as image:
            if image.getexif() or any(field in image.info for field in ("exif", "xmp", "icc_profile", "comment")):
                raise PipelineError("local derivative still contains forbidden metadata")
        data = derivative.read_bytes()
        expected_digest = str(photo.get("derivative_sha256", ""))
        if sha256_bytes(data) != expected_digest:
            raise PipelineError(f"local derivative digest mismatch: {key}")
        existing = _existing_object_matches(bucket, key, expected_digest)
        if existing is True:
            skipped_existing.append(key)
            continue
        if existing is False:
            raise PipelineError(f"destination already contains different content: {key}")
        try:
            bucket.put_object(key, BytesIO(data), headers={"x-oss-forbid-overwrite": "true"})
        except Exception as error:
            if not _is_conflict(error):
                raise PipelineError(f"OSS upload failed for {key}") from error
            if _existing_object_matches(bucket, key, expected_digest) is True:
                skipped_existing.append(key)
                continue
            raise PipelineError(f"destination refused upload and does not match expected content: {key}") from error
        if _existing_object_matches(bucket, key, expected_digest) is not True:
            raise PipelineError("uploaded destination could not be verified against the local digest")
        uploaded.append(key)
    return {"uploaded": uploaded, "skipped_existing": skipped_existing}


def _require_nonempty(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise PipelineError(f"{field} is required and must be non-empty")
    text = value.strip()
    if len(text) > 2_000 or any(ord(character) < 32 or ord(character) == 127 for character in text):
        raise PipelineError(f"{field} contains disallowed control characters or is too long")
    return text


def _plain_markdown(value: str) -> str:
    return "".join(f"\\{character}" if character in r"\\`*_{}[]<>()#+-.!|" else character for character in html.escape(value))


def _validate_observations(manifest: dict[str, Any], observations: dict[str, Any]) -> dict[str, dict[str, str]]:
    validate_manifest(manifest)
    if observations.get("batch") != manifest.get("batch"):
        raise PipelineError("observations must use the same batch as the manifest")
    result: dict[str, dict[str, str]] = {}
    for item in observations.get("photos", []):
        source_digest = _require_nonempty(item.get("source_sha256"), "source_sha256")
        if source_digest in result:
            raise PipelineError("observations contain duplicate source_sha256 values")
        result[source_digest] = {
            "derivative_sha256": _require_nonempty(item.get("derivative_sha256"), "derivative_sha256"),
            "alt": _require_nonempty(item.get("alt"), "alt"),
            "caption": _require_nonempty(item.get("caption"), "caption"),
            "observation": _require_nonempty(item.get("observation"), "observation"),
        }
    manifest_digests = {str(photo["source_sha256"]) for photo in manifest.get("photos", [])}
    if set(result) != manifest_digests:
        raise PipelineError("observations must map exactly once to every manifest source digest")
    for photo in manifest.get("photos", []):
        if result[str(photo["source_sha256"])]["derivative_sha256"] != photo["derivative_sha256"]:
            raise PipelineError("observation derivative digest does not match the manifest")
    return result


def render_draft(manifest: dict[str, Any], observations: dict[str, Any], metadata: dict[str, Any]) -> str:
    """Render a truthful, unpublished Astro entry from externally reviewed observations."""
    observation_map = _validate_observations(manifest, observations)
    article_id = validate_article_id(_require_nonempty(metadata.get("article_id"), "article_id"))
    title = _require_nonempty(metadata.get("title"), "title")
    published_date = _require_nonempty(metadata.get("date"), "date")
    try:
        if date.fromisoformat(published_date).isoformat() != published_date:
            raise ValueError
    except ValueError as error:
        raise PipelineError("date must use exact YYYY-MM-DD format") from error
    location = _require_nonempty(metadata.get("location"), "location")
    description = _require_nonempty(metadata.get("description"), "description")
    coordinates = metadata.get("coordinates")
    if not isinstance(coordinates, dict) or not isinstance(coordinates.get("lat"), (int, float)) or not isinstance(coordinates.get("lng"), (int, float)):
        raise PipelineError("coordinates must contain numeric city-level lat and lng")
    if not -90 <= coordinates["lat"] <= 90 or not -180 <= coordinates["lng"] <= 180:
        raise PipelineError("coordinates are outside valid geographic bounds")
    tags = metadata.get("tags", [])
    if not isinstance(tags, list) or any(not isinstance(tag, str) or not tag.strip() for tag in tags):
        raise PipelineError("tags must be an array of non-empty strings")
    photos = manifest.get("photos", [])
    if not photos:
        raise PipelineError("cannot draft an article without photos")
    lines = [
        "---",
        f'title: {json.dumps(title, ensure_ascii=False)}',
        f"date: {published_date}",
        f'location: {json.dumps(location, ensure_ascii=False)}',
        "coordinates:",
        f"  lat: {coordinates['lat']}",
        f"  lng: {coordinates['lng']}",
        f"cover: {hosted_url(str(photos[0]['derivative_key']))}",
        f'description: {json.dumps(description, ensure_ascii=False)}',
        "tags:",
        *[f"  - {json.dumps(tag.strip(), ensure_ascii=False)}" for tag in tags],
        "gallery:",
    ]
    for photo in photos:
        observation = observation_map[str(photo["source_sha256"])]
        lines.extend(
            [
                f"  - src: {hosted_url(str(photo['derivative_key']))}",
                f"    alt: {json.dumps(observation['alt'], ensure_ascii=False)}",
                f"    caption: {json.dumps(observation['caption'], ensure_ascii=False)}",
                f"    width: {photo['width']}",
                f"    height: {photo['height']}",
            ]
        )
    lines.extend(
        [
            "draft: true",
            "---",
            "",
            f"<!-- travel-photo-pipeline: batch={manifest['batch']} article={article_id} -->",
            "以下图注仅根据逐张已查看的画面观察整理；未据此推断具体拍摄地点、人物身份或主观感受。",
            "",
            *[f"- {_plain_markdown(observation_map[str(photo['source_sha256'])]['observation'])}" for photo in photos],
            "",
        ]
    )
    return "\n".join(lines)


def write_observation_template(workspace: Path, manifest: dict[str, Any], *, approve_model_view: bool) -> Path:
    if not approve_model_view:
        raise AuthorizationError("creating a model-review queue requires --approve-model-view")
    validate_manifest(manifest, workspace)
    template = {
        "batch": manifest["batch"],
        "instruction": "View every local preview before writing. Describe only visible content; do not infer locations, people, or feelings.",
        "photos": [
            {
                "source_sha256": photo["source_sha256"],
                "derivative_sha256": photo["derivative_sha256"],
                "preview": photo["local_preview"],
                "alt": "",
                "caption": "",
                "observation": "",
            }
            for photo in manifest["photos"]
        ],
    }
    output = _workspace_file(workspace.resolve(), "observations.template.json")
    _write_immutable(output, (json.dumps(template, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    return output


def write_draft(workspace: Path, manifest: dict[str, Any], observations: dict[str, Any], metadata: dict[str, Any]) -> Path:
    """Write an unpublished draft outside the Astro content tree."""
    output = _workspace_file(workspace.resolve(), "draft.md")
    _write_immutable(output, render_draft(manifest, observations, metadata).encode("utf-8"))
    return output


def stage_article(
    repo_root: Path,
    workspace: Path,
    manifest: dict[str, Any],
    observations: dict[str, Any],
    metadata: dict[str, Any],
    *,
    approve_publish_article: bool,
) -> Path:
    """Explicitly promote an approved staged entry while refusing human-edited replacements."""
    if not approve_publish_article:
        raise AuthorizationError("article promotion requires --approve-publish-article")
    article_id = validate_article_id(_require_nonempty(metadata.get("article_id"), "article_id"))
    draft = render_draft(manifest, observations, metadata).encode("utf-8")
    state_path = _workspace_file(workspace.resolve(), "publication-state.json")
    if state_path.exists():
        state = json.loads(state_path.read_text(encoding="utf-8"))
        if state.get("batch") == manifest["batch"] and state.get("article_id") != article_id:
            raise PipelineError("batch is already mapped to a different article_id")
    target = _safe_child(repo_root.resolve(), f"src/content/travel/{article_id}.md")
    if target.exists():
        if target.read_bytes() != draft:
            raise PipelineError("refusing to replace an existing article; it may contain human edits")
    else:
        _write_immutable(target, draft)
    state = {"batch": manifest["batch"], "article_id": article_id, "article_sha256": sha256_bytes(draft)}
    if state_path.exists():
        if state_path.read_text(encoding="utf-8") != json.dumps(state, ensure_ascii=False, indent=2, sort_keys=True) + "\n":
            raise PipelineError("refusing to replace publication state with divergent data")
    else:
        _write_immutable(state_path, (json.dumps(state, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8"))
    return target


def _load_json(path: Path) -> dict[str, Any]:
    try:
        loaded = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise PipelineError(f"cannot read JSON file: {path}") from error
    if not isinstance(loaded, dict):
        raise PipelineError(f"JSON object required: {path}")
    return loaded


def _validate_private_workspace(path: Path, repo_root: Path) -> None:
    ancestor = path
    while ancestor != ancestor.parent:
        if ancestor.is_symlink():
            raise PipelineError("workspace and raw input must not use symlink ancestors")
        ancestor = ancestor.parent
    resolved = path.resolve()
    for publishable in (repo_root / "src", repo_root / "public"):
        try:
            resolved.relative_to(publishable.resolve())
        except ValueError:
            continue
        raise PipelineError("workspace and raw input must stay outside src/ and public/")


def _oss_credentials_from_environment() -> tuple[str, str, str | None]:
    """Read one complete credential convention from this process only, never mixing aliases."""
    standard = (os.environ.get("OSS_ACCESS_KEY_ID"), os.environ.get("OSS_ACCESS_KEY_SECRET"))
    legacy = (os.environ.get("AccessKey_ID"), os.environ.get("AccessKey_Secret"))
    has_standard = any(standard)
    has_legacy = any(legacy)
    if not has_standard and not has_legacy:
        raise PipelineError("missing OSS credentials in environment; no network request was made")
    if has_standard and has_legacy:
        raise PipelineError("OSS credentials are mixed or incomplete; configure exactly one complete credential pair")
    access_key_id, access_key_secret = standard if has_standard else legacy
    if not access_key_id or not access_key_secret:
        raise PipelineError("OSS credentials are mixed or incomplete; configure exactly one complete credential pair")
    security_token = os.environ.get("OSS_SECURITY_TOKEN")
    if not security_token and access_key_id.upper().startswith("STS"):
        raise PipelineError("STS credential requires OSS_SECURITY_TOKEN; no network request was made")
    return access_key_id, access_key_secret, security_token


def _oss_bucket_from_environment() -> Any:
    access_key_id, access_key_secret, security_token = _oss_credentials_from_environment()
    try:
        import oss2
    except ImportError as error:
        raise PipelineError("OSS support requires `pip install -r tools/requirements-travel-photo-pipeline.txt`") from error
    auth = oss2.StsAuth(access_key_id, access_key_secret, security_token) if security_token else oss2.Auth(access_key_id, access_key_secret)
    return oss2.Bucket(auth, OSS_ENDPOINT, OSS_BUCKET_NAME)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", type=Path, default=Path.cwd(), help="repository root; defaults to the current directory")
    parser.add_argument("--workspace", type=Path, default=Path("var/travel-photo-pipeline"), help="ignored private workspace")
    subcommands = parser.add_subparsers(dest="command", required=True)

    prepare = subcommands.add_parser("prepare")
    prepare.add_argument("--batch", required=True)
    prepare.add_argument("--source", choices=("local", "oss"), required=True)
    prepare.add_argument("--input", type=Path)
    prepare.add_argument("--approve-remote-read", action="store_true")
    prepare.add_argument("--incremental", action="store_true", help="opt in to fixed-inventory bounded OSS rounds")
    prepare.add_argument("--approve-incremental", action="store_true", help="confirm use of the incremental OSS workflow")

    observe = subcommands.add_parser("observation-template")
    observe.add_argument("--approve-model-view", action="store_true")

    upload = subcommands.add_parser("upload")
    upload.add_argument("--approve-remote-read", action="store_true")
    upload.add_argument("--approve-upload", action="store_true")
    upload.add_argument("--approve-publish-photo", action="store_true")

    draft = subcommands.add_parser("draft")
    draft.add_argument("--metadata", type=Path, required=True)
    draft.add_argument("--observations", type=Path, required=True)

    stage = subcommands.add_parser("stage-article")
    stage.add_argument("--metadata", type=Path, required=True)
    stage.add_argument("--observations", type=Path, required=True)
    stage.add_argument("--approve-publish-article", action="store_true")

    args = parser.parse_args(argv)
    try:
        _validate_private_workspace(args.workspace, args.repo_root)
        repo_root = args.repo_root.resolve()
        workspace = args.workspace.resolve()
        if args.command == "prepare":
            validate_batch(args.batch)
            if args.source == "local":
                if args.incremental or args.approve_incremental:
                    raise PipelineError("incremental preparation is supported only with --source oss")
                if args.input is None:
                    raise PipelineError("prepare --source local requires --input")
                _validate_private_workspace(args.input, repo_root)
                manifest = prepare_local(args.input, workspace, args.batch)
            else:
                if not args.approve_remote_read:
                    raise AuthorizationError("OSS preparation requires --approve-remote-read")
                bucket = _oss_bucket_from_environment()
                if args.incremental:
                    manifest = prepare_oss_incremental(
                        bucket,
                        workspace,
                        args.batch,
                        approve_remote_read=True,
                        approve_incremental=args.approve_incremental,
                    )
                elif args.approve_incremental:
                    raise PipelineError("--approve-incremental requires prepare --incremental")
                else:
                    manifest = prepare_oss(bucket, workspace, args.batch, approve_remote_read=True)
            print(json.dumps({"status": "prepared", "count": len(manifest["photos"])}, ensure_ascii=False))
        elif args.command == "observation-template":
            write_observation_template(workspace, _load_json(_manifest_path(workspace)), approve_model_view=args.approve_model_view)
            print(json.dumps({"status": "observation_template_created"}, ensure_ascii=False))
        elif args.command == "upload":
            result = upload_derivatives(
                _oss_bucket_from_environment(),
                workspace,
                _load_json(_manifest_path(workspace)),
                approve_remote_read=args.approve_remote_read,
                approve_upload=args.approve_upload,
                approve_publish_photo=args.approve_publish_photo,
            )
            print(json.dumps({"status": "uploaded", "uploaded": len(result["uploaded"]), "already_present": len(result["skipped_existing"])}, ensure_ascii=False))
        elif args.command == "draft":
            write_draft(workspace, _load_json(_manifest_path(workspace)), _load_json(args.observations), _load_json(args.metadata))
            print(json.dumps({"status": "draft_created"}, ensure_ascii=False))
        elif args.command == "stage-article":
            stage_article(repo_root, workspace, _load_json(_manifest_path(workspace)), _load_json(args.observations), _load_json(args.metadata), approve_publish_article=args.approve_publish_article)
            print(json.dumps({"status": "article_staged"}, ensure_ascii=False))
    except (PipelineError, AuthorizationError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
