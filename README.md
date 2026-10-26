# DSH Super Nexusx · DSH 超级工作台

[![CI](https://github.com/biek12/dsh-super-nexusx/actions/workflows/ci.yml/badge.svg)](https://github.com/biek12/dsh-super-nexusx/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 打造的开源工作台增强插件，把会话整理、Liquid Glass 主题、上下文洞察和陪伴宠物集中到同一套界面中。

当前版本 **0.11.10**，处于早期迭代阶段。macOS 已适配 **DSH Desktop Beta 2.0.18-beta.1 / DSH 0.2.1-rc.2**；Windows 客户端新增标题栏、侧栏折叠与重新展开适配，基于 **DSH NEXT 2.0.19-next / DSH 0.2.1-rc.2** 的原生组件验证，安装方式见 [Windows 安装说明](docs/WINDOWS.md)。其他宿主版本尚未完成兼容验证。

[安装指南](docs/INSTALLATION.md) · [开发说明](docs/DEVELOPMENT.md) · [更新记录](CHANGELOG.md) · [验证记录](docs/VALIDATION.md) · [问题反馈](https://github.com/biek12/dsh-super-nexusx/issues) · [参与贡献](CONTRIBUTING.md)

## 为什么做这个项目

随着工作区和对话增多，平铺的会话列表很难持续整理。Super Nexusx 希望让 DSH 既能处理任务，也能帮助你保持工作环境有序：会话可以归类、标记和查找，运行状态与用量更容易看到，外观与陪伴功能可以按需启用。

本项目通过 DSH 插件接口和客户端扩展实现增强。Liquid Glass 是其中的主题功能，项目以 GitHub 开源仓库维护与分发。

## 功能

| 模块 | 当前能力 |
| --- | --- |
| 会话目录 | 工作区内多层目录、会话拖拽归类、同级排序、目录移动；阻止循环嵌套和跨工作区误移动 |
| 手动整理 | 图标 / Emoji、颜色、标签、收藏、状态与筛选；一个会话归属一个目录 |
| 侧栏导航 | 展开目录树、折叠级联菜单、新建会话与工作区、返回原生管理 |
| Liquid Glass | 深浅色及跟随系统、侧栏和主界面材质、柔和过渡、全局忙碌提示、减少动态效果 |
| 模型交互 | 基于宿主真实档位的连续推理等级滑条、思考与工具调用状态呈现 |
| 上下文洞察 | 集成 dsh-context 0.77.0 的上下文、用量、附件、工具与多智能体相关面板 |
| 陪伴宠物 | 糯米、月白、泡泡三款角色；待机、眨眼、拖拽、气泡与位置保存 |
| 任务提醒 | 基于 Host 真实完成事件显示气泡；支持关闭声音与提醒，过滤取消、错误和子智能体完成 |
| macOS 桌面陪伴 | 可选 AppKit / WebKit 透明伴随窗口，支持找回位置；发行 tgz 已内置对应 CPU 的原生程序 |

主题可以关闭，目录功能可独立使用。用量与费用展示受宿主数据和计价表覆盖范围限制；缺失数据会显示不可用，不应作为账单依据。

## 快速开始

需要 Node.js **22.19+**、npm 和 **DSH 0.2.0-rc.2+**（内置 dsh-context 0.77.0 的最低要求）。克隆源码后构建安装包：

```bash
git clone https://github.com/biek12/dsh-super-nexusx.git
cd dsh-super-nexusx
npm ci
npm run check
npm test
npm run pack:plugin
```

也可直接从 [Releases](https://github.com/biek12/dsh-super-nexusx/releases/latest) 下载对应 CPU 的完整 tgz，无需自行编译或单独安装宠物程序：

| 系统 / CPU | 完整安装包 |
| --- | --- |
| macOS / Apple Silicon（M 系列） | `dsh-super-nexusx-0.11.10-darwin-arm64.tgz` |
| macOS / Intel | `dsh-super-nexusx-0.11.10-darwin-x64.tgz` |
| Windows / 客户端通用 JS | `dsh-super-nexusx-0.11.10-win32.tgz` |

两种 macOS 包均包含完整插件、桌面宠物原生程序、角色素材和提示音，要求 macOS 13+。M 系列使用 arm64 包原生运行，无需 Rosetta。Windows 包通过 `npm run pack:windows` 生成，包含客户端、窗口内宠物和提示音；全桌面透明伴随窗口仍仅支持 macOS。Linux 暂不提供发行包。

源码打包需要 macOS 与 Xcode Command Line Tools。`npm run pack:plugin` 自动构建当前 CPU 的完整包；`npm run release:build` 构建两个 CPU 的包并生成校验文件。

先核对 `dsh --version` 与宿主版本一致，完全退出 DSH，再安装到实际使用的 Profile。macOS Desktop 内置 CLI 的明确调用方式见 [安装指南](docs/INSTALLATION.md)：

```bash
# 以下为 Apple Silicon / Desktop Beta 默认 home 与 Profile 示例；Intel 使用 darwin-x64 包
DSH_HOME="$HOME/.dsh-beta" dsh plugin --profile desktop add ./releases/dsh-super-nexusx-0.11.10-darwin-arm64.tgz
```

重新打开 DSH，在“已安装插件”中查找 `dsh-super-nexusx`，并在设置中打开 **DSH 超级工作台**。不要只把入口路径写进 Cordis patch；这种方式可以运行插件，但不会登记到“已安装”列表。旧版本迁移、Profile 选择与卸载见 [安装指南](docs/INSTALLATION.md)。

本仓库保存源码，构建文件由 `npm run pack:plugin` 生成。尚未声明 npm 公共注册表发布，不应假定 `npm install dsh-super-nexusx` 已可用。

## 数据与权限

- 目录、分类和偏好保存在宿主的独立 `liquid_glass` 存储领域，保留历史键以兼容更名前的数据。
- 插件通过宿主接口访问工作区、会话、上下文和账户信息；查询余额与用量需要宿主提供对应能力。
- 分类修改先校验并持久化，多个窗口发生版本冲突时返回最新状态，避免静默覆盖。
- 插件自身不设置额外的分析上报服务；集成模块与宿主可能访问其上游服务，相关实现可以在源码中审阅。
- 完成提醒保存在内存中，不写入聊天正文。停用时释放观察器、订阅、计时器及桌面伴随进程。

## 兼容范围与限制

- 当前适配上述 DSH Beta 环境，宿主 DOM 和插件接口变化可能需要跟进。遇到异常请附上精确版本。
- 原生桌面伴随窗口仅实现 macOS；Windows、Linux 当前使用窗口内宠物，全桌面能力属于后续评估。
- 多屏、长会话性能和第三方界面插件组合仍需要更多实机反馈。建议避免同时启用多个接管侧栏或主题的插件。
- 已集成 dsh-context，独立版本同时启用可能出现重复入口，建议在对应 Profile 中停用独立版本。
- 本项目与 DeepSeek 官方无隶属关系。版本号、兼容声明和路线图以本仓库文档为准。

## 支持计划与路线图

项目按维护者可用时间推进，以 GitHub Issues 和 Pull Requests 提供社区支持，目前不承诺响应时限或企业 SLA。以下为计划方向，顺序和实现方式会随反馈调整，未标记完成的能力不属于当前承诺。

| 阶段 | 工作方向 | 状态 |
| --- | --- | --- |
| 当前基础 | 目录管理、主题、上下文集成、窗口宠物、macOS 伴随窗口 | 已实现，继续稳定性验证 |
| 稳定与分发 | 标准 bundle 安装、源码构建、静态检查、CI、安装排错文档 | 本版补齐 |
| 兼容性 | 跟进 DSH 版本、完善升级回归、长会话和多窗口验证 | 持续推进 |
| 数据管理 | 评估分类数据导入导出、备份与迁移工具 | 规划 |
| 平台支持 | macOS 多屏及多架构验证；评估 Windows / Linux 桌面伴随 | 待验证 / 待评估 |
| 工作台扩展 | 评估记忆系统与现有上下文功能协作 | 规划，尚未实现 |

支持项目可以从复现缺陷、完善文档、验证不同系统、提交修复开始。提出新功能时请描述具体场景；开发和贡献流程见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 反馈与安全问题

普通问题使用 [Issues](https://github.com/biek12/dsh-super-nexusx/issues)，请提供系统、架构、DSH 版本、插件版本、安装方式及最小复现步骤。截图和日志请先移除个人路径、密钥、账户信息及会话内容。

安全问题请参考 [SECURITY.md](SECURITY.md)，避免在公开 Issue 中附上可利用细节或秘密信息。

## 致谢与许可

本项目以 [MIT License](LICENSE) 开源。第三方代码保留各自许可与版权声明，完整说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 和 [licenses/](licenses/)。

感谢 [dsh-context](https://github.com/bowenliang123/dsh-context)、[dsh-codex-effort-slider](https://github.com/Microqian2th/dsh-codex-effort-slider)、[dsh-claude-style](https://github.com/Nwflower/dsh-claude-style) 提供的实现基础，以及 [DeepSeek Balance Whale Widget](https://github.com/MeteorNOX/DeepSeek-Balance-Whale-Widget) 的交互参考。宠物素材使用 AI 图像生成工具制作，见 [素材说明](assets/pets/README.md)。
