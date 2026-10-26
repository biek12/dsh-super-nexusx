# Windows 客户端适配

适用于 DSH NEXT 2.0.19-next / DSH 0.2.1-rc.2 的 Windows 标题栏结构。平台样式由宿主的 `html[data-windows-titlebar]` 标识启用，关闭 Liquid Glass 主题后自动恢复宿主布局，macOS 和浏览器不应用这些规则。

- 按 `--dsh-windows-titlebar-height` 保留标题栏高度（默认 40px），品牌、侧栏与内容卡片排列在菜单下方。
- 移除侧栏固定按钮祖先的裁剪及毛玻璃包含块，侧栏宽度为 0 时仍能点击“打开侧边栏”和“新会话”。
- 保留宿主切换处理、快捷键、菜单偏移与窗口最小化 / 最大化 / 关闭按钮。
- 深浅色沿用主题变量；窗口内宠物继续可用。macOS 的 AppKit 桌面伴随程序不包含在 Windows 包中。

## 构建安装包

需要 Node.js 22.19+，无需 Swift 或 macOS SDK：

```powershell
Set-Location D:\dsh-super-nexusx
npm ci
npm run check
npm test
npm run pack:windows
```

输出为 `releases/dsh-super-nexusx-0.11.10-win32.tgz`，同时生成 `.sha256` 校验文件。安装包声明 `os: ["win32"]`，不限制 CPU 架构，安装时不运行构建或下载脚本。

先保存工作并退出 DSH。DSH NEXT 的 `desktop` Profile 由 Electron 专管，普通 `dsh plugin --profile desktop` 会拒绝操作；使用桌面端自带的专用入口安装，例如：

```powershell
$taskDshApp = 'D:\Program Files\DSH NEXT\DSH NEXT.exe'
$taskPluginCli = 'D:\Program Files\DSH NEXT\resources\app.asar\lib\plugin-cli.js'
$taskPreviousNodeMode = $env:ELECTRON_RUN_AS_NODE
$taskPreviousDshHome = $env:DSH_HOME
try {
  $env:ELECTRON_RUN_AS_NODE = '1'
  $env:DSH_HOME = Join-Path $env:USERPROFILE '.dsh'
  & $taskDshApp --expose-internals $taskPluginCli desktop add `
    'dsh-super-nexusx@file:D:/dsh-super-nexusx/releases/dsh-super-nexusx-0.11.10-win32.tgz' --ignore-scripts
} finally {
  $env:ELECTRON_RUN_AS_NODE = $taskPreviousNodeMode
  $env:DSH_HOME = $taskPreviousDshHome
}
```

按实际安装位置修改程序路径；其他宿主应使用其配套插件管理入口。不要手工改写 Profile 配置或删除会话数据。重新启动 DSH 后，在“已安装插件”中确认版本为 0.11.10。

## 验收

检查展开 / 收起 / 再展开、标题栏“应用 / 编辑”菜单、收起后的新会话按钮、窄窗口自动收起及手动展开、深浅色与主题关闭恢复。验证范围与实际执行结果见 [验证记录](VALIDATION.md)。
