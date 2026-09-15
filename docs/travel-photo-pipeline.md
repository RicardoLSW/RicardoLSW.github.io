## 旅行照片流水线

`tools/travel_photo_pipeline.py` 是可复用的本地优先流水线。它只接受 JPEG（v1 明确拒绝 RAW），对图像做方向校正、删除全部 EXIF/GPS/XMP/ICC/注释元数据并压缩为 JPEG。本次接入验收未执行真实 OSS 请求、上传或生成真实游记；没有真实批次名时绝不把示例当作输入。

所有原图下载、预览图、清单、观察记录和草稿都在 Git 忽略的 `var/travel-photo-pipeline/<batch>/`。不要把它放到 `src/` 或 `public/`，不要提交原图、密钥、签名 URL 或草稿。流水线最多处理 100 张、单张输入/派生图最多 128 MiB、整批最多 512 MiB、最多 40,000,000 像素和一页；拒绝路径穿越和符号链接。源端只读，不写入或删除 `travel/<batch>/` 中的原图。

展示图长边上限 2400 px，模型预览长边上限 768 px，不放大小图；宽高按 EXIF 旋转和缩放后的实际结果记录。源图仅解码和本地处理，不经过 OSS 在线图片处理。整批原始字节快照最多 512 MiB，加上解码缓冲，建议 Runtime 为本任务保留至少 2 GiB 可用内存。

### 安装和本地准备

需要 Python 3.13 和 Pillow。OSS 适配器使用阿里云官方 `oss2` SDK，但只有显式 OSS 命令才导入并使用它：

```bash
python -m pip install -r tools/requirements-travel-photo-pipeline.txt
python tools/travel_photo_pipeline.py --repo-root . --workspace var/travel-photo-pipeline/<batch> prepare --source local --batch <batch> --input <private-local-jpeg-directory>
```

`<batch>` 必须是小写 slug，流水线只会推导精确的 `travel/<batch>/` 和 `blog-images/<batch>/` 前缀。输出对象名固定为 `blog-images/<batch>/v1-<原图SHA-256>.jpg`；完全相同的清单、派生图和草稿重复运行是幂等成功，任何不同字节都会安全拒绝覆盖。工作区会绑定一个 batch 和原图快照；输入新增、替换或改批次时请新建工作区，避免混入未经重新观察的版本。

### 明确授权门槛

四类动作独立授权，不能因持有一种授权推断另三种授权：

| 动作 | 命令和必需标志 | 行为 |
| --- | --- | --- |
| 远程读取原图 | `prepare --source oss --approve-remote-read` | 仅分页 list/get `travel/<batch>/`；无标志或缺凭据时在请求前失败。 |
| 模型/人工查看派生小图 | `observation-template --approve-model-view` | 仅生成待审模板；执行者必须逐张实际查看 `previews/` 后才填记录。 |
| 远程上传派生图 | `upload --approve-remote-read --approve-upload --approve-publish-photo` | 仅向 `blog-images/<batch>/` PUT；上传前读取精确既有对象并核对完整 SHA-256。 |
| 发布站内文章 | `stage-article --approve-publish-article` | 单独将已经审核的草稿写入内容集合；不上传图片、不改变 OSS ACL。 |

`upload` 通过 `x-oss-forbid-overwrite: true` 请求服务端禁止覆盖；若对象已存在，只有下载并逐字节计算 SHA-256 后完全一致才作为幂等成功，否则失败。它不调用删除、ACL 或 IAM API。上传可能导致公开可访问，因此必须同时显式给出 `--approve-publish-photo`。所有命令都不接受密钥作为参数，也不打印环境变量。

OSS 固定使用 bucket `figure-b` 和 endpoint `https://oss-cn-shanghai.aliyuncs.com`。运行前由账户所有者/管理员在私有环境中配置短期 STS 凭据 `OSS_ACCESS_KEY_ID`、`OSS_ACCESS_KEY_SECRET`、`OSS_SECURITY_TOKEN`；不要在命令行、聊天、Git 或 Markdown 中放密钥。凭据过期后由管理员刷新环境。当前候选公开图片域名为 `https://figure-b.ricardolsw.com`：仅完成过默认 TLS 证书/主机名校验（TLS 1.2，证书至 2026-11-03 23:59:59 GMT），**没有**验证匿名对象读取、CORS 或防盗链策略，不能据此声称图片已可公开访问。

管理员为运行时配置环境时使用完整映射替换，并先保留/合并既有需要的变量：

```bash
multica agent env set 0a95da5a-3203-48d3-9913-afd189aafedb --custom-env-file <private-json>
```

该操作仅限账户所有者/管理员；`<private-json>` 不属于仓库或任务附件。私有完整映射的最小形状仅含 STS 三元组占位符：

```json
{"OSS_ACCESS_KEY_ID":"<sts-access-key-id>","OSS_ACCESS_KEY_SECRET":"<sts-access-key-secret>","OSS_SECURITY_TOKEN":"<sts-security-token>"}
```

三项必须作为同一次短期 STS 凭据配置；该命令替换完整映射，管理员须合并所需既有变量。到期、泄露或撤销时立即删除/撤销旧 STS 并以新的三元组刷新；绝不把真实值放入聊天、argv、Git 或文档。

### 观察、草稿与发布

准备完成后，取得模型查看授权，再生成一对一模板：

```bash
python tools/travel_photo_pipeline.py --repo-root . --workspace var/travel-photo-pipeline/<batch> observation-template --approve-model-view
```

执行者必须实际打开每张本地 `previews/*.jpg`，在 `observations.json` 中为每个 `source_sha256` 和 `derivative_sha256` 填写 `alt`、`caption`、`observation`。只能描述画面中可见内容；不要猜测地点、人物身份、关系、时间或感受。脚本强制记录与清单一一对应、摘要匹配且文本非空，但真实性仍由审阅者负责。

`observations.json` 和 `metadata.json` 均为私有文件；`<...>` 必须替换为 `manifest.json` 的精确值，日期只能使用 `YYYY-MM-DD`：

```json
{"batch":"<batch>","photos":[{"source_sha256":"<64-hex-source-sha256>","derivative_sha256":"<64-hex-derivative-sha256>","alt":"画面中可见的内容","caption":"简短图注","observation":"仅陈述画面中可见的内容。"}]}
```

```json
{"article_id":"<article-slug>","title":"人工确认的标题","date":"2026-09-15","location":"公开城市级地点","coordinates":{"lat":30.0,"lng":120.0},"description":"人工确认的简短说明。","tags":["摄影"]}
```

使用经过审阅的观察 JSON 和人工提供的城市级元数据（标题、日期、地点、公开坐标、简介、标签）先生成私有草稿：

```bash
python tools/travel_photo_pipeline.py --repo-root . --workspace var/travel-photo-pipeline/<batch> draft --metadata <private-metadata.json> --observations <private-observations.json>
```

生成的 `cover` 和 `gallery.src` 是无查询参数的稳定 URL：`https://figure-b.ricardolsw.com/blog-images/<batch>/v1-<sha256>.jpg`，绝不使用签名 URL。Astro 内容 schema 只接受本地 Astro 资产或该精确的 HTTPS 域名/路径格式；组件为远程 JPEG 保留尺寸、懒加载和图库行为。

私有草稿默认是 `draft: true`，不会触及站点内容。审阅并确认后才可执行 `stage-article --metadata <private-metadata.json> --observations <private-observations.json> --approve-publish-article`。它按批次保存 `article_id` 和文章 SHA-256；目标文章已存在但字节不同时拒绝覆盖，保护人工编辑。只有提供所有真实元数据和单独 `--approve-publish-article` 才会写入 `src/content/travel/`。本次没有真实批次，因此没有运行此命令、没有写入真实文章，也没有上传照片。

### 最小 RAM 权限策略（占位模板）

为专用 STS/RAM 身份授予最小权限。以下是**每个实际 `<batch>` 单独替换后**交给账户管理员核验的 JSON 占位模板（请按阿里云账户/区域 ARN 格式复核后再应用）：

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["oss:ListObjects"],
      "Resource": ["acs:oss:*:*:figure-b"],
      "Condition": {"StringLike": {"oss:Prefix": ["travel/<batch>/*"]}}
    },
    {
      "Effect": "Allow",
      "Action": ["oss:GetObject"],
      "Resource": [
        "acs:oss:*:*:figure-b/travel/<batch>/*",
        "acs:oss:*:*:figure-b/blog-images/<batch>/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["oss:PutObject"],
      "Resource": ["acs:oss:*:*:figure-b/blog-images/<batch>/*"]
    }
  ]
}
```

上传前使用精确 `GetObject` 核验，不需要 `blog-images` 的 List 权限。绝不授予 `DeleteObject`、任何 ACL/Policy 写入、bucket 管理、RAM/IAM 用户/角色/策略变更或 STS 签发权限。角色/用户的继承策略、群组策略和资源策略均可能叠加权限，管理员必须审计后确认不存在额外的 `GetObject`、`PutObject`、删除或 ACL 权限。不要使用主账号 AccessKey；管理员配置并刷新短期 STS 环境变量，运行者只读取进程环境。

### 验证

```bash
python tests/travel_photo_pipeline_test.py
npm run verify
```

Python 离线测试使用假 bucket，不发网络请求；包含真实有效且大于 20 MiB 的 JPEG 成功处理、128 MiB 单文件拒绝、512 MiB 批次界限、分页/精确前缀、数量/像素/页边界、RAW/符号链接拒绝、方向与 EXIF/GPS 清除、确定性命名、幂等重跑、摘要比对和失败恢复。`npm run verify` 还执行 Astro 类型检查、构建和站点契约测试。
