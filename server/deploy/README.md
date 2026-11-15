# 阿里云 ECS 部署准备

`server/aliyun.mjs` 使用 Node.js 内置 HTTP 服务运行现有 DeepSeek 接口，无运行时 npm 依赖。服务使用 `/opt/knowdrug-api/node/bin/node`，避免依赖 Ubuntu 22.04 软件源中较旧的 Node.js 12。

部署前需取得实例 ID、地域及 Workbench 凭证或 SSH 访问方式，并检查系统、Node.js 路径、可用端口、Nginx 和已有站点。本目录的 service、域名及证书路径均为待确认模板，不能直接覆盖服务器配置。

建议部署目录 `/opt/knowdrug-api`，服务环境文件 `/etc/knowdrug-api.env`。真实密钥只保存在服务器权限为 `0600` 的环境文件中；`env.example` 不包含密钥。监听本机 `127.0.0.1:3001`，通过已有 Nginx 的独立 HTTPS 虚拟主机或路径转发。`TRUST_PROXY=1` 仅接受回环代理提供的真实客户端 IP，忽略外部传入的 CF IP 头。

没有域名时，也可在确认 ECS 公网 IP 与 80/443 端口可用后申请 Let's Encrypt 的 IP 地址证书。Certbot 5.4 及以上版本支持 `--preferred-profile shortlived --webroot --ip-address <公网 IP>`；IP 证书有效期约 6 天，必须配置自动续期以及续期后重新加载 Nginx。先用 `--staging` 验证，再申请正式证书。`nginx-ip.conf.example` 是 IP 场景占位模板，证书路径的 `PUBLIC_IP` 需替换为公网 IP；投入使用前须按服务器已有站点配置调整。`nginx.conf.example` 是域名场景占位模板。参考：https://letsencrypt.org/2026/03/11/shorter-certs-certbot/

已确认目标公网 IP `101.132.38.176` 的 SSH 端口 22 可达，而 80 与 443 从外网连接超时。申请证书及浏览器调用接口前，需要在阿里云安全组和实例防火墙中确认 80/443 入站放通。不要在服务器未检查前直接覆盖现有 Nginx 配置。

检查顺序：本机 health → 服务器本机 health → 域名 HTTPS → GitHub 来源 CORS → 三专家真实回答及三个追问 → 药品专家越界拒答。全部通过后才更新代表端 API 地址。

Workbench CLI 已安装在本机 `~/.local/bin/workbench`。如未配置阿里云 CLI，使用 `workbench config --mode AK` 配置 Workbench 自身凭证。账号凭证直接在终端输入，不放进本仓库。准备包不会包含任何凭证。
