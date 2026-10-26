# 安装与插件面板排查

内置 dsh-context 0.77.0 要求 DSH 0.2.0-rc.2 或更高版本。

## 从源码生成安装包

```bash
git clone https://github.com/biek12/dsh-super-nexusx.git
cd dsh-super-nexusx
npm ci
npm run check
npm test
npm run pack:plugin
# 在 macOS 同时构建 Apple Silicon 和 Intel 完整包
npm run release:build
```

输出位于 `releases/`，采用 `<包名>-<版本>-<OS>-<CPU>.tgz` 命名：

- Apple Silicon（M 系列）：`dsh-super-nexusx-0.11.10-darwin-arm64.tgz`。
- Intel：`dsh-super-nexusx-0.11.10-darwin-x64.tgz`。

发行包要求 macOS 13+。每个 tgz 均内置对应 CPU 的原生桌面宠物程序、桌面网页、完整插件及提示音，不需要额外安装另一个程序。包清单包含 `os` / `cpu` 约束，`BUILD_INFO.json` 记录目标架构及原生程序校验值。源码编译需要 macOS SDK，使用下载好的发行包无需 Swift 或 Xcode。

M 芯片应选择 arm64 包；旧 0.11.5 包的 Intel 伴随程序也可能通过 Rosetta 运行，但本版提供原生 arm64 程序。Windows / Linux 的桌面伴随未实现，本版不发布对应完整包。也可以使用仓库 Releases 中实际提供的同版本安装包。GitHub 源码仓库不提交 `lib/`，请构建后安装，不直接把 Git URL 当成已构建安装包。

## 安装到正确的 Profile

完全退出 DSH，使用实际宿主对应的 CLI、DSH_HOME 和 Profile 安装：

```bash
# Apple Silicon 示例；Intel 将文件名改为 darwin-x64；按实际安装修改 home 与 Profile
DSH_HOME="$HOME/.dsh-beta" dsh plugin --profile desktop add ./releases/dsh-super-nexusx-0.11.10-darwin-arm64.tgz
DSH_HOME="$HOME/.dsh-beta" dsh plugin --profile desktop list dsh-super-nexusx
```

请先运行 `dsh --version` 核对版本。本机排查发现全局 CLI 为 `0.1.7-rc.2`，而 Desktop Beta 内置为 `0.2.1-rc.2`；系统终端与 DSH 自带终端的 `dsh` 可能不是同一个程序。优先在 DSH 自带终端使用其包装命令。macOS 上也可以明确调用应用内的 CLI（路径按实际安装修改）：

```bash
DSH_HOME="$HOME/.dsh-beta" ELECTRON_RUN_AS_NODE=1 \
  "/Applications/DSH Desktop Beta.app/Contents/MacOS/DSH Desktop Beta" \
  --expose-internals \
  "/Applications/DSH Desktop Beta.app/Contents/Resources/app/lib/desktop-cli.js" \
  plugin --profile desktop add ./releases/dsh-super-nexusx-0.11.10-darwin-arm64.tgz
```

Desktop 的 CLI 版本应与其内置 DSH 运行时匹配。不要用不兼容的全局 CLI 覆盖 Desktop 的依赖或关闭宿主包龄策略。安装后重新打开 DSH，在已安装插件中查找包名 `dsh-super-nexusx`。同一 Profile 中只启用一个目录/主题增强实现；内置的 dsh-context 集成启用时，建议停用独立的 dsh-context，避免重复面板。

## 为什么插件生效但“已安装”中找不到

DSH 插件面板的 `listBundles()` 从 Profile 的 `package.json` 依赖、`dsh.profile.bundles` 和宿主提供的 bundle 获取列表。单独向 `cordis.patch.yml` 插入 `file:///.../lib/index.js` 可以加载代码，却不会把该插件登记成可管理的包。

检查以下三项：

1. 当前窗口与命令使用相同的 DSH_HOME 和 Profile；装到 `web` 的包不会出现在 `desktop` 的列表。
2. Profile 的 `package.json` 中有 `dependencies["dsh-super-nexusx"]`，且 `dsh.profile.bundles` 包含同名项。
3. 安装包包含 `package.json`、`lib/index.js`、`lib/client.js` 与 `cordis.patch.yml`；清单声明 `dsh.bundle.patch`，且 patch 指向正确包名。本项目已配置这几项。

这些清单应由 `dsh plugin ... add` 管理。不要只复制文件、手工伪造市场登记或为了显示条目修改宿主代码。

## 从旧文件入口迁移

1. 完全退出 DSH，备份该 Profile 的 `package.json`、锁文件、`cordis.patch.yml` 及 `liquid_glass` 分类存储。
2. 按上面的命令安装构建好的 tgz。
3. 确认包依赖和 bundle 已登记后，从 Profile patch 中移除旧的 `super-nexusx-local` 或 `liquid-glass-local` 文件插入条目，避免两份插件同时加载。保留其他配置。
4. 重开 DSH，核对插件列表、原有目录、偏好与宠物位置。

插件继续使用原有独立存储领域，不需删除旧数据。

## 停用与卸载

在已安装插件面板中停用，或完全退出 DSH 后运行：

```bash
DSH_HOME="$HOME/.dsh-beta" dsh plugin --profile desktop remove dsh-super-nexusx
```

旧文件入口不属于 bundle 安装，不能仅靠上述 remove 命令卸载，需先移除对应 patch 插入项。分类元数据独立保存；卸载不会替你删除工作区、会话或手动清除元数据。

宿主管理契约参考：[DSH CLI](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/reference/README.md)、[bundle 发布指南](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md)。当前 Desktop Beta 的具体实现以其内置版本为准。
