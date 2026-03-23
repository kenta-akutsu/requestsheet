# ARCHITECTURE.md — システム構成

## 全体アーキテクチャ

```
[ブラウザ]
    │  HTTPS
    ▼
[GCP Cloud Run]
  Next.js 14 App
  ├── App Router (SSR/RSC)
  ├── API Routes
  └── Middleware (Auth guard)
    │
    ├─── [Supabase]
    │      ├── Auth (Google OAuth + Email)
    │      └── PostgreSQL (DB)
    │
    ├─── [Anthropic API]
    │      └── claude-sonnet-4-20250514 (streaming)
    │
    └─── [Asana API v1]
           ├── GET /projects/{gid}/tasks  (タスク一覧)
           └── POST /tasks/{gid}/subtasks (サブタスク作成)
```

---

## GCP 構成詳細

### Cloud Run

```yaml
# cloud-run-config.yaml
service: zenx-request
region: asia-northeast1   # 東京リージョン
memory: 512Mi
cpu: 1
min-instances: 0          # コールドスタート許容（社内ツールのため）
max-instances: 5
timeout: 300s             # AIストリーミングのため長めに設定
concurrency: 80
```

### GCP Secret Manager（機密情報管理）

全ての機密情報はSecret Managerで管理し、Cloud Runにマウントする。

```bash
# シークレット作成コマンド
gcloud secrets create ANTHROPIC_API_KEY --replication-policy="automatic"
gcloud secrets create SUPABASE_SERVICE_ROLE_KEY --replication-policy="automatic"
gcloud secrets create ASANA_ACCESS_TOKEN --replication-policy="automatic"

# Cloud Run に環境変数としてマウント
gcloud run services update zenx-request \
  --update-secrets=ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest \
  --update-secrets=SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest \
  --update-secrets=ASANA_ACCESS_TOKEN=ASANA_ACCESS_TOKEN:latest
```

### Cloud Build (CI/CD)

```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'asia-northeast1-docker.pkg.dev/$PROJECT_ID/zenx-request/app:$COMMIT_SHA'
      - '--build-arg'
      - 'NEXT_PUBLIC_SUPABASE_URL=${_SUPABASE_URL}'
      - '--build-arg'
      - 'NEXT_PUBLIC_SUPABASE_ANON_KEY=${_SUPABASE_ANON_KEY}'
      - '.'

  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'asia-northeast1-docker.pkg.dev/$PROJECT_ID/zenx-request/app:$COMMIT_SHA'

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'zenx-request'
      - '--image'
      - 'asia-northeast1-docker.pkg.dev/$PROJECT_ID/zenx-request/app:$COMMIT_SHA'
      - '--region'
      - 'asia-northeast1'
      - '--platform'
      - 'managed'

substitutions:
  _SUPABASE_URL: ''      # Cloud Buildトリガーで設定
  _SUPABASE_ANON_KEY: '' # Cloud Buildトリガーで設定

options:
  logging: CLOUD_LOGGING_ONLY
```

### Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 8080

CMD ["node", "server.js"]
```

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',  // Cloud Run用
}
module.exports = nextConfig
```

---

## データフロー

### フロー1: リクエストシート作成

```
1. 営業 → /requests/new でフォーム入力
2. POST /api/requests で feature_request レコード作成
3. POST /api/chat でAIチャット開始（ストリーミング）
4. チャット往復でチェックリスト充足
5. TIER1+2 充足 → AIが "SHEET_COMPLETE:" プレフィックス付きJSON出力
6. フロント側でJSONをパース → request_sheets に保存
7. POST /api/asana/subtask でAsanaサブタスク作成
8. feature_request.status を 'under_review' に更新
```

### フロー2: エンジニア返答

```
1. エンジニア → /dashboard でアサイン済み案件を確認
2. /requests/[id] でリクエストシートを確認
3. POST /api/responses で返答を送信
4. feature_request.status を 'responded' に更新
```

---

## セキュリティ

### Row Level Security (RLS) — Supabase

```sql
-- feature_requests: salesは自分のものだけ、engineer/bizdevは全件
CREATE POLICY "sales_own_requests" ON feature_requests
  FOR ALL USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('engineer', 'bizdev', 'admin')
    )
  );

-- responses: engineer/bizdevのみ作成可能
CREATE POLICY "engineer_responses" ON responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('engineer', 'bizdev', 'admin')
    )
  );
```

### Next.js Middleware (認証ガード)

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // /login以外は認証必須
  if (request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.next()
  }

  const supabase = createServerClient(...)
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```
