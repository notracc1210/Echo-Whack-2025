#!/bin/bash

# 检查 Google Cloud 配额使用情况
# 需要安装 gcloud CLI

echo "🔍 检查 Google Cloud 配额使用情况..."
echo ""

PROJECT_ID=$(cd server && node -e "require('dotenv').config(); console.log(process.env.GOOGLE_CLOUD_PROJECT_ID)")

if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "your-project-id" ]; then
    echo "❌ 未设置 GOOGLE_CLOUD_PROJECT_ID"
    exit 1
fi

echo "项目 ID: $PROJECT_ID"
echo ""

if ! command -v gcloud &> /dev/null; then
    echo "⚠️  gcloud CLI 未安装"
    echo ""
    echo "请访问 Google Cloud Console 查看配额:"
    echo "https://console.cloud.google.com/iam-admin/quotas?project=$PROJECT_ID"
    echo ""
    echo "或者安装 gcloud CLI:"
    echo "brew install google-cloud-sdk"
    exit 1
fi

echo "检查 Speech-to-Text API 相关配额..."
echo ""

# 列出 Speech-to-Text 相关的配额
gcloud compute project-info describe --project="$PROJECT_ID" 2>/dev/null || echo "无法获取项目信息"

echo ""
echo "查看详细配额信息:"
echo "https://console.cloud.google.com/iam-admin/quotas?project=$PROJECT_ID"
echo ""
echo "搜索以下配额名称:"
echo "- Speech-to-Text API - Characters per minute"
echo "- Speech-to-Text API - Requests per minute"
echo "- Speech-to-Text API - Concurrent requests"










