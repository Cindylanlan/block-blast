#!/bin/bash
# Gitee Pages 部署脚本
# 使用前请先在 gitee.com 创建空仓库 block-blast
# 将下面的 GITEE_REPO 改为你的 Gitee 用户名/仓库名

set -e
GITEE_REPO="${GITEE_REPO:-Cindylanlan/block-blast}"

echo "Building..."
npm run build

echo "Deploying to Gitee Pages..."
cd dist
rm -rf .git 2>/dev/null || true
git init
git add -A
git commit -m "deploy: Gitee Pages"
git branch -M master
git remote add gitee "git@gitee.com:${GITEE_REPO}.git"
git push -f gitee master:master

echo ""
echo "Done! 请在 Gitee 仓库中：服务 -> Gitee Pages -> 开启"
echo "访问链接: https://${GITEE_REPO%%/*}.gitee.io/block-blast/"
