#!/bin/bash
set -euo pipefail

# ============================================
# RequestSheet - Cloud Run デプロイスクリプト
# ============================================

# --- 設定 ---
PROJECT_ID="gemini-api-for-web"
REGION="asia-northeast1"
SERVICE_NAME="requestsheet"
REPO_NAME="requestsheet"
IMAGE_TAG=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/app:${IMAGE_TAG}"

# --- 色付き出力 ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== RequestSheet デプロイ開始 ===${NC}"
echo "Project:  ${PROJECT_ID}"
echo "Region:   ${REGION}"
echo "Service:  ${SERVICE_NAME}"
echo "Image:    ${IMAGE_URI}"
echo ""

# --- Step 1: GCPプロジェクト設定 ---
echo -e "${YELLOW}[1/6] GCPプロジェクトを設定中...${NC}"
gcloud config set project ${PROJECT_ID}

# --- Step 2: 必要なAPIを有効化（初回のみ） ---
echo -e "${YELLOW}[2/6] 必要なAPIを有効化中...${NC}"
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  --quiet

# --- Step 3: Artifact Registry リポジトリ作成（初回のみ） ---
echo -e "${YELLOW}[3/6] Artifact Registryリポジトリを確認中...${NC}"
if ! gcloud artifacts repositories describe ${REPO_NAME} --location=${REGION} --quiet 2>/dev/null; then
  echo "リポジトリを作成します..."
  gcloud artifacts repositories create ${REPO_NAME} \
    --repository-format=docker \
    --location=${REGION} \
    --description="RequestSheet container images"
else
  echo "リポジトリは既に存在します。"
fi

# --- Step 4: Docker認証設定 ---
echo -e "${YELLOW}[4/6] Docker認証を設定中...${NC}"
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet

# --- Step 5: Dockerイメージをビルド＆プッシュ ---
echo -e "${YELLOW}[5/6] Dockerイメージをビルド＆プッシュ中...${NC}"

# .env.localからビルド時に必要な環境変数を読み取る
SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d '=' -f2)
SUPABASE_ANON_KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d '=' -f2)

docker build \
  --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="${SUPABASE_URL}" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY}" \
  -t "${IMAGE_URI}" \
  .

docker push "${IMAGE_URI}"

# --- Step 6: Cloud Runにデプロイ ---
echo -e "${YELLOW}[6/6] Cloud Runにデプロイ中...${NC}"

# .env.localからサーバーサイド環境変数を読み取る
SUPABASE_SERVICE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d '=' -f2)
GEMINI_KEY=$(grep GEMINI_API_KEY .env.local | cut -d '=' -f2)
ASANA_TOKEN=$(grep ASANA_ACCESS_TOKEN .env.local | cut -d '=' -f2)
ASANA_DEV_PROJECT=$(grep ASANA_DEV_PROJECT_GID .env.local | cut -d '=' -f2)
ASANA_SALES_PROJECT=$(grep ASANA_SALES_PROJECT_GID .env.local | cut -d '=' -f2)

gcloud run deploy ${SERVICE_NAME} \
  --image "${IMAGE_URI}" \
  --region ${REGION} \
  --platform managed \
  --port 8080 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}" \
  --set-env-vars "NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}" \
  --set-env-vars "SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_KEY}" \
  --set-env-vars "GEMINI_API_KEY=${GEMINI_KEY}" \
  --set-env-vars "ASANA_ACCESS_TOKEN=${ASANA_TOKEN}" \
  --set-env-vars "ASANA_DEV_PROJECT_GID=${ASANA_DEV_PROJECT}" \
  --set-env-vars "ASANA_SALES_PROJECT_GID=${ASANA_SALES_PROJECT}"

# --- 完了 ---
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format 'value(status.url)')
echo ""
echo -e "${GREEN}=== デプロイ完了！ ===${NC}"
echo -e "URL: ${GREEN}${SERVICE_URL}${NC}"
echo ""
echo "次回以降のデプロイは: ./deploy.sh"
