# 开发与构建

## 目录

| 路径 | 内容 |
| --- | --- |
| `src/` | Host、客户端、目录、主题、上下文适配与宠物 |
| `desktop/` | macOS AppKit / WebKit 伴随窗口 |
| `assets/pets/` | 运行时角色素材 |
| `vendor/dsh-context/` | 固定在 0.77.0 的上游源码与发布 bundle |
| `licenses/` | 第三方完整许可 |
| `tests/` | 数据、HTTP、生命周期和 UI 回归测试 |
| `preview/` | 本机交互预览 |
| `scripts/` | 构建、静态检查、打包和本机验证 |
| `.github/` | CI 与问题模板 |

## 常用命令

```bash
npm ci
npm run check
npm test
npm run build
npm run pack:plugin
```

`npm run build` 只构建 JS，不读取本机 DSH 安装包，也不依赖 Python 或 Swift，可在 Linux CI 中运行。

完整发行包只通过以下命令生成，要求 macOS 与 Xcode Command Line Tools：

```bash
npm run pack:plugin                   # 当前 CPU 的完整包
npm run pack:plugin -- --arch arm64    # Apple Silicon 完整包
npm run pack:plugin -- --arch x64      # Intel 完整包
npm run release:build                 # 两个 CPU 包和 SHA256SUMS
npm run test:release                  # 解包检查实际 CPU、权限、清单和校验值
```

规范命名为 `dsh-super-nexusx-<版本>-darwin-<arm64|x64>.tgz`。每次打包在隔离临时目录重新编译对应 CPU 的原生伴随程序，不使用上次构建遗留的可执行文件。随后写入平台约束、`BUILD_INFO.json` 及原生程序哈希，再将完整插件和伴随程序打成一个 tgz。发布包不携带开发期脚本或依赖，不需要在安装时联网下载或编译宠物程序。

`npm pack` 自身仅是底层开发打包操作。macOS 完整发行包使用 `release:build` 的两个命名包及 SHA256SUMS。Windows 使用 `npm run pack:windows` 单独构建客户端包和 `.sha256` 文件，包含窗口内宠物，不包含 macOS 原生伴随程序。安装与适配范围见 [Windows 说明](WINDOWS.md)。Linux 仅检查通用源码构建。

`vendor/dsh-context/lib/` 是固定上游发布产物，参与 Host 和客户端构建，必须随源码保留；其来源和 tarball 哈希见 `UPSTREAM.json`。`src/vendor/context-client.cjs` 由构建脚本生成，不手工编辑。其余 `src/vendor/` 文件是经适配的上游实现。相关许可证见 `THIRD_PARTY_NOTICES.md`。

## 真实宿主验证与预览

```bash
npm run build:preview
npm run preview
npm run test:installed
npm run test:bundle  # 先生成 releases/ 中的当前版本 tgz
```

这两类验证需要本机安装 DSH。默认读取 macOS 的 `/Applications/DSH Desktop Beta.app/Contents/Resources/app/node_modules/@deepseek-ai`，其他位置可设置 `DSH_MODULE_ROOT`。预览生成的宿主 CSS 位于忽略的 `artifacts/` 中，不随插件分发。`test:installed` 使用临时存储，不改活动 Profile。`test:bundle` 解压真实 tgz，在临时 Profile 中调用宿主原始 `listBundles()`，验证文件入口不可见、包登记后可见，以及版本、翻译和 patch 行。

`npm run build:desktop -- --arch arm64` 或 `--arch x64` 可为指定 CPU 编译本机预览所需的 `lib/desktop/PetCompanion`。编译目标为 macOS 13+；跨 CPU 编译不会自动执行另一架构的程序。CI 同时构建并解包检查两种发行包，但实机交互兼容性需要在对应设备验收。

## 兼容标识

公开包名与加载 ID 为 `dsh-super-nexusx`。`liquid_glass` 领域、`/plugins/dsh-liquid-glass/` 兼容路由、`lg-` 样式前缀、偏好键和 macOS UserDefaults 标识沿用历史值，避免升级丢失数据。它们不是遗漏更名的目录。Liquid Glass 是工作台中的主题名称。
