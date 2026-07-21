#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}=== Interleaved PFC 自动提交脚本 ===${NC}"

if [ -z "$(git status --porcelain)" ]; then
  echo -e "${RED}❌ 没有需要提交的更改${NC}"
  exit 1
fi

VERSION=$(node -p "require('./package.json').version")
echo -e "当前版本: ${GREEN}v${VERSION}${NC}"

IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"
NEW_PATCH=$((PATCH + 1))
NEW_VERSION="${MAJOR}.${MINOR}.${NEW_PATCH}"

node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
pkg.version = '${NEW_VERSION}';
fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
"

echo -e "新版本: ${GREEN}v${NEW_VERSION}${NC}"

read -p "输入提交信息: " MSG
if [ -z "$MSG" ]; then
  MSG="更新内容"
fi

npm run build

git add .
git commit -m "v${NEW_VERSION} ${MSG}"
git tag "v${NEW_VERSION}"

echo -e "${GREEN}✅ 提交成功: v${NEW_VERSION} ${MSG}${NC}"
echo -e "${YELLOW}请手动执行: git push && git push --tags${NC}"
