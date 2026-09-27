# Maestro MCP

本项目在 `.mcp.json`（Claude Code）和 `.codex/config.toml`（Codex）配置了 Maestro 的本地 stdio 服务。已有 `.maestro/` 流程继续复用，不需要应用端依赖或云端账号。

先安装 Maestro CLI 和其要求的 Java 环境，再从仓库根目录启动 agent。启动脚本优先使用 PATH 中的 Maestro，也支持官方默认的 `~/.maestro/bin/maestro` 安装位置，不需要提交本机绝对路径。

重启 agent 后检查 MCP 服务列表。Claude Code 首次可能要求批准项目 MCP；Codex 需要信任项目才加载项目配置。不要覆盖 agent 的已有权限设置。

可以让 agent 列出可用设备、检查测试应用的界面，再运行 `.maestro/` 下的流程。执行前选择明确的测试设备和测试包，保存运行命令、日志、截图及录屏作为可重复证据；不要默认操作正式用户资料。仅列出工具或设备不代表应用端到端验证通过。

排查启动失败：在仓库根目录运行 `bash scripts/maestro-mcp.sh`，检查 Maestro CLI 与 JAVA_HOME。该命令使用 stdin/stdout 传输 MCP 消息，启动后等待输入是正常行为。

官方接入说明：https://docs.maestro.dev/get-started/maestro-mcp
