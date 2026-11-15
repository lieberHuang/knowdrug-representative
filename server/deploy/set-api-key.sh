#!/usr/bin/env bash
set -euo pipefail

if (( EUID != 0 )); then
  printf '请以 root 运行。\n' >&2
  exit 1
fi

env_file=/etc/knowdrug-api.env
[[ -f "$env_file" ]] || { printf '服务环境文件不存在。\n' >&2; exit 1; }
[[ -t 0 ]] || { printf '请在交互终端输入密钥。\n' >&2; exit 1; }

printf 'DeepSeek API Key（输入时不会显示）: ' >&2
IFS= read -r -s api_key
printf '\n' >&2
[[ "$api_key" =~ ^sk-[A-Za-z0-9_-]+$ ]] || { printf '密钥格式不正确。\n' >&2; exit 1; }

umask 077
temp_file=$(mktemp /etc/knowdrug-api.env.XXXXXX)
trap 'rm -f "$temp_file"' EXIT
grep -v '^DEEPSEEK_API_KEY=' "$env_file" > "$temp_file" || true
printf 'DEEPSEEK_API_KEY=%s\n' "$api_key" >> "$temp_file"
chmod 600 "$temp_file"
chown root:root "$temp_file"
mv "$temp_file" "$env_file"
trap - EXIT
unset api_key
systemctl restart knowdrug-api
printf '已保存密钥并重启服务。\n'
