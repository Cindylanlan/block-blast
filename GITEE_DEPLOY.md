# Gitee Pages 部署说明

## 方式一：GitHub Actions 自动部署（推荐）

推送代码到 GitHub 后自动构建并部署到 Gitee Pages。

### 1. 首次手动开启 Gitee Pages

1. 打开 https://gitee.com/Cindylanlan/block-blast
2. 进入 **服务** → **Gitee Pages** → 点击 **启动**
3. 完成 Gitee 实名认证（若未完成）

### 2. 配置 GitHub Secrets

在 GitHub 仓库 **Settings** → **Secrets and variables** → **Actions** 中添加：

| Secret 名称 | 用途 | 获取方式 |
|-------------|------|----------|
| `GITEE_TOKEN` | 推送构建产物到 Gitee | Gitee → 设置 → 私人令牌 → 生成新令牌（勾选 `projects` 权限） |
| `GITEE_PASSWORD` | 触发 Pages 部署 | 填 Gitee 登录密码，或同上私人令牌（令牌可代替密码） |

### 3. 关注 Gitee 公众号

关注 Gitee 公众号并绑定账号，可绕过短信验证码（Action 触发部署时会模拟登录）。

### 4. 触发部署

- 推送代码到 `master` 分支会自动触发
- 或到 **Actions** 页手动运行 `Deploy to Gitee Pages` workflow

### 5. 访问链接

**https://cindylanlan.gitee.io/block-blast/**

---

## 方式二：本地手动部署

```bash
# 若 Gitee 用户名不是 Cindylanlan，先设置环境变量：
export GITEE_REPO=你的用户名/block-blast

# 执行部署（需已配置 SSH 或 HTTPS 认证）
npm run deploy:gitee
```

或直接运行：

```bash
./deploy-gitee.sh
```

---

## 微信分享

将链接发到微信即可，国内可正常打开。
