# 阿里云 ECS 部署准备

`server/aliyun.mjs` 使用 Node.js 内置 HTTP 服务运行现有 DeepSeek 接口，无运行时 npm 依赖。启动命令：`node server/aliyun.mjs`。

部署前需取得实例 ID、地域及 Workbench 凭证或 SSH 访问方式，并检查系统、Node.js 路径、可用端口、Nginx 和已有站点。本目录的 service、域名及证书路径均为待确认模板，不能直接覆盖服务器配置。

建议部署目录 `/opt/knowdrug-api`，服务环境文件 `/etc/knowdrug-api.env`。真实密钥只保存在服务器权限为 `0600` 的环境文件中；`env.example` 不包含密钥。监听本机 `127.0.0.1:3001`，通过已有 Nginx 的独立 HTTPS 虚拟主机或路径转发。`TRUST_PROXY=1` 仅接受回环代理提供的真实客户端 IP，忽略外部传入的 CF IP 头。

检查顺序：本机 health → 服务器本机 health → 域名 HTTPS → GitHub 来源 CORS → 三专家真实回答及三个追问 → 药品专家越界拒答。全部通过后才更新代表端 API 地址。

Workbench CLI 已安装在本机 `~/.local/bin/workbench`。如未配置阿里云 CLI，使用 `workbench config --mode AK` 配置 Workbench 自身凭证。账号凭证直接在终端输入，不放进本仓库。准备包不会包含任何凭证。
