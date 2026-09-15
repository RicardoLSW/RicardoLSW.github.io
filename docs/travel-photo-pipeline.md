## 旅行照片流水线

`tools/travel_photo_pipeline.py` 是可复用的本地优先流水线。它只接受 JPEG（v1 明确拒绝 RAW），对图像做方向校正、删除全部 EXIF/GPS/XMP/ICC/注释元数据并压缩为 JPEG。每次真实 OSS 处理、模型查看和草稿验收结果均在对应私有 issue 留档；离线测试不代表真实批次完成，没有真实批次名时绝不把示例当作输入。

所有原图下载、预览图、清单、观察记录和草稿都在 Git 忽略的 `var/travel-photo-pipeline/<workspace-id>/`。不要把它放到 `src/` 或 `public/`，不要提交原图、密钥、签名 URL 或草稿。`<workspace-id>` 必须在本机文件系统中唯一；对于包含大写字母的源批次，使用下文的派生存储映射作为目录名，不能仅以大小写区分目录。流水线最多处理 100 张、单张输入/派生图最多 128 MiB、最多 40,000,000 像素和一页；默认 `prepare` 的整批原始字节上限为 512 MiB，拒绝路径穿越和符号链接。源端只读，不写入或删除 `travel/<batch>/` 中的原图。

展示图长边上限 2400 px，模型预览长边上限 768 px，不放大小图；宽高按 EXIF 旋转和缩放后的实际结果记录。源图仅解码和本地处理，不经过 OSS 在线图片处理。默认模式会保留整批原始快照，仍受 512 MiB 总量限制；下文的增量模式不保存原始文件，但仍会保留**全部**轮次的派生图、预览和清单。每轮原始字节最多 512 MiB，不等于总本地磁盘或图像解码内存；40,000,000 像素上限也不是操作系统级内存使用保证。请按全批派生图/预览的实际总量预留空间（理论输入上限下可接近 25 GiB），并为单张 128 MiB JPEG 的解码、旋转和编码保留至少 2 GiB 可用内存。

### 安装和本地准备

需要 Python 3.13 和 Pillow。OSS 适配器使用阿里云官方 `oss2` SDK，但只有显式 OSS 命令才导入并使用它：

```bash
python -m pip install -r tools/requirements-travel-photo-pipeline.txt
python tools/travel_photo_pipeline.py --repo-root . --workspace var/travel-photo-pipeline/<workspace-id> prepare --source local --batch <batch> --input <private-local-jpeg-directory>
```

`<batch>` 是区分大小写的 ASCII slug（字母、数字、连字符），源端前缀始终按原样推导为精确的 `travel/<batch>/`，绝不转换为小写。例如 `SuZhou` 只会列举/读取 `travel/SuZhou/`，不会读取 `travel/suzhou/`。为兼容已有小写批次，小写 `<batch>` 的派生前缀仍是 `blog-images/<batch>/`；含大写字母时，派生存储映射为 `<batch 的小写形式>~<原始 ASCII 字节的十六进制>`，例如 `SuZhou` 映射为 `suzhou~53755a686f75`。因此大小写不同的源批次在 OSS、文章内容和 Windows 的私有工作目录都不会碰撞。输出对象名固定为 `blog-images/<storage-batch>/v1-<原图SHA-256>.jpg`；完全相同的清单、派生图和草稿重复运行是幂等成功，任何不同字节都会安全拒绝覆盖。工作区会绑定原始大小写的 batch 和原图快照；输入新增、替换或改批次时请新建工作区，避免混入未经重新观察的版本。文章 `article_id` 独立于 batch，但仍必须是小写 slug；若另一批次指定已存在的文章 ID，内容字节不同时会拒绝覆盖，保护人工编辑和跨批次隔离。

### 超过默认总量时的显式增量准备

默认 `prepare --source oss` 保持原行为：它要求整批不超过 512 MiB。不要用它处理已知超限的批次。增量模式只适用于 OSS，并且必须同时明确选择模式和确认授权；以下命令只列举/读取精确的 `travel/SuZhou/`，不扫描 `travel/` 根或其他批次：

```bash
python tools/travel_photo_pipeline.py --repo-root . --workspace var/travel-photo-pipeline/suzhou-incremental prepare --source oss --batch SuZhou --incremental --approve-incremental --approve-remote-read
```

`--incremental` 不是默认模式，缺少 `--approve-incremental` 会在下载前拒绝。它仍需要独立的 `--approve-remote-read` 和正常的最小权限凭据；不授予上传、公开照片、模型查看或文章发布权限。每个源对象仍限 JPEG、128 MiB、40,000,000 像素和一页，批次仍最多 100 对象；RAW/HEIC 等不支持。计划中的每轮原始字节总和不超过 512 MiB，按源 key 的确定性顺序划分，且不会把整批原始数据同时读入内存或保存在工作区。

首次执行会在私有工作区一次性创建不可覆盖的 `incremental-plan.json`：其中固定精确前缀、按 key 排序的每个 `key`、`size`、`etag`，以及确定性的轮次和字节总量。ETag 是大小写敏感的不透明值；计划仅会去除合法的最外层双引号，不会转换大小写。每完成一轮才不可覆盖地写入 `incremental-rounds/0001-manifest.json`（及对应 `incremental-progress/` 记录）；其中保存完整源 key/size/ETag、源 SHA-256、派生图和预览图 SHA-256、路径及尺寸。下载将计划 ETag 包装为带双引号的 RFC 强实体标签，再作为 `If-Match` 条件请求；缺失/无效 ETag、条件失败或实际下载字节数与计划 size 不同都会拒绝，绝不混用改版原图。

中断后用**同一条完整命令和同一工作区**恢复。恢复会先重新分页列举同一精确前缀，并严格比较对象数量以及每个 `key`、`size`、`etag`；任何新增、删除、改名、大小或版本变化都会拒绝，必须选新工作区重新观察。不可变文件先在同目录写完、刷新并同步到唯一临时文件，关闭后才以不覆盖方式发布；写入或同步失败不会留下该次调用的目标文件，可直接重跑。此机制不能保证任意断电或磁盘损坏后自动恢复；已存在且内容不同的人工文件或损坏文件仍会停止处理，绝不覆盖。已验证的轮次会校验所有派生图和预览哈希后复用，不重复下载。只有所有轮次成功后才写根 `manifest.json`。因此 `observation-template`、`draft`、`upload` 和 `stage-article` 只能使用这个完整根清单；轮次清单不是完整批次，绝不能用于部分观察、草稿、上传或发布。

### 明确授权门槛

四类动作独立授权，不能因持有一种授权推断另三种授权：

| 动作 | 命令和必需标志 | 行为 |
| --- | --- | --- |
| 远程读取原图 | `prepare --source oss --approve-remote-read` | 仅分页 list/get `travel/<batch>/`；无标志或缺凭据时在请求前失败。 |
| 模型/人工查看派生小图 | `observation-template --approve-model-view` | 仅生成待审模板；执行者必须逐张实际查看 `previews/` 后才填记录。 |
| 远程上传派生图 | `upload --approve-remote-read --approve-upload --approve-publish-photo` | 仅向该源批次映射的 `blog-images/<storage-batch>/` PUT；上传前读取精确既有对象并核对完整 SHA-256。 |
| 发布站内文章 | `stage-article --approve-publish-article` | 单独将已经审核的草稿写入内容集合；不上传图片、不改变 OSS ACL。 |

`upload` 通过 `x-oss-forbid-overwrite: true` 请求服务端禁止覆盖；若对象已存在，只有下载并逐字节计算 SHA-256 后完全一致才作为幂等成功，否则失败。它不调用删除、ACL 或 IAM API。上传可能导致公开可访问，因此必须同时显式给出 `--approve-publish-photo`。所有命令都不接受密钥作为参数，也不打印环境变量。

OSS 固定使用 bucket `figure-b` 和 endpoint `https://oss-cn-shanghai.aliyuncs.com`。运行时只读取**当前进程环境**，不接受密钥命令行参数，也不打印环境变量。账户所有者/管理员在私有运行时配置以下两组之一，ID 与 Secret 必须成对出现，绝不能混配：

| 凭据对 | 可选项 | 认证方式 |
| --- | --- | --- |
| `OSS_ACCESS_KEY_ID` + `OSS_ACCESS_KEY_SECRET` | `OSS_SECURITY_TOKEN` | 有 token 使用 `oss2.StsAuth`；无 token 使用 `oss2.Auth`（长期 RAM AccessKey）。 |
| `AccessKey_ID` + `AccessKey_Secret` | `OSS_SECURITY_TOKEN` | 与上一行相同，兼容既有别名。 |

STS 身份在可辨识但缺少 `OSS_SECURITY_TOKEN` 时会在网络请求前安全拒绝；不配置任意完整对、配置半对，或同时配置两种命名对同样会在网络请求前失败。不要在命令行、聊天、Git 或 Markdown 中放密钥。STS 到期由管理员刷新；长期 RAM AccessKey 也必须使用仅限本批精确前缀的最小权限并由所有者轮换。当前候选公开图片域名为 `https://figure-b.ricardolsw.com`：仅完成过默认 TLS 证书/主机名校验（TLS 1.2，证书至 2026-11-03 23:59:59 GMT），**没有**验证匿名对象读取、CORS 或防盗链策略，不能据此声称图片已可公开访问。

管理员为运行时配置环境时使用完整映射替换，并先保留/合并既有需要的变量：

```bash
multica agent env set 0a95da5a-3203-48d3-9913-afd189aafedb --custom-env-file <private-json>
```

该操作仅限账户所有者/管理员；`<private-json>` 不属于仓库或任务附件。私有完整映射可使用以下任一占位形状；不要同时放入两组 ID/Secret：

```json
{"OSS_ACCESS_KEY_ID":"<access-key-id>","OSS_ACCESS_KEY_SECRET":"<access-key-secret>","OSS_SECURITY_TOKEN":"<sts-security-token-if-applicable>"}
```

```json
{"AccessKey_ID":"<access-key-id>","AccessKey_Secret":"<access-key-secret>"}
```

该命令替换完整映射，管理员须合并所需既有变量。到期、泄露或撤销时立即删除/撤销旧凭据并安全刷新；绝不把真实值放入聊天、argv、Git 或文档。

### 观察、草稿与发布

准备完成后，取得模型查看授权，再生成一对一模板：

```bash
python tools/travel_photo_pipeline.py --repo-root . --workspace var/travel-photo-pipeline/<workspace-id> observation-template --approve-model-view
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
python tools/travel_photo_pipeline.py --repo-root . --workspace var/travel-photo-pipeline/<workspace-id> draft --metadata <private-metadata.json> --observations <private-observations.json>
```

生成的 `cover` 和 `gallery.src` 是无查询参数的稳定 URL：`https://figure-b.ricardolsw.com/blog-images/<storage-batch>/v1-<sha256>.jpg`，绝不使用签名 URL。Astro 内容 schema 只接受本地 Astro 资产或该精确的 HTTPS 域名/路径格式；组件为远程 JPEG 保留尺寸、懒加载和图库行为。

私有草稿默认是 `draft: true`，不会触及站点内容。审阅并确认后才可执行 `stage-article --metadata <private-metadata.json> --observations <private-observations.json> --approve-publish-article`。它按批次保存 `article_id` 和文章 SHA-256；目标文章已存在但字节不同时拒绝覆盖，保护人工编辑。只有提供所有真实元数据和单独 `--approve-publish-article` 才会写入 `src/content/travel/`。缺少可靠的日期、地点或公开坐标时，只在私有工作区写正文及待确认字段，不填假值来通过 schema；这类正文不能称为可构建文章。真实照片、原始清单和预览不默认作为 issue 附件分享，且上传派生图与发布文章始终需要另外授权。

### 最小 RAM 权限策略（占位模板）

为专用 STS/RAM 身份授予最小权限。以下是**每个实际源 `<batch>` 及其 `<storage-batch>` 映射单独替换后**交给账户管理员核验的 JSON 占位模板；`travel/<batch>/` 必须保留源端原始大小写（请按阿里云账户/区域 ARN 格式复核后再应用）：

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
        "acs:oss:*:*:figure-b/blog-images/<storage-batch>/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["oss:PutObject"],
      "Resource": ["acs:oss:*:*:figure-b/blog-images/<storage-batch>/*"]
    }
  ]
}
```

上传前使用精确 `GetObject` 核验，不需要 `blog-images` 的 List 权限。绝不授予 `DeleteObject`、任何 ACL/Policy 写入、bucket 管理、RAM/IAM 用户/角色/策略变更或 STS 签发权限。角色/用户的继承策略、群组策略和资源策略均可能叠加权限，管理员必须审计后确认不存在额外的 `GetObject`、`PutObject`、删除或 ACL 权限。不要使用主账号 AccessKey；管理员只能在私有运行时配置最小权限的 RAM 凭据或短期 STS 凭据，STS 到期由管理员刷新，运行者只读取当前进程环境。

### 验证

```bash
python tests/travel_photo_pipeline_test.py
npm run verify
```

Python 离线测试使用假 bucket，不发网络请求；包含真实有效且大于 20 MiB 的 JPEG 成功处理、128 MiB 单文件拒绝、512 MiB 批次界限、分页/精确前缀、数量/像素/页边界、RAW/符号链接拒绝、方向与 EXIF/GPS 清除、确定性命名、幂等重跑、摘要比对和失败恢复。`npm run verify` 还执行 Astro 类型检查、构建和站点契约测试。
