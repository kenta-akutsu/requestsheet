# IMPLEMENTATION_PLAN.md — フェーズ別実装計画

## 実装の絶対順序

**この順序を守ること。スキップ禁止。**

---

## Phase 0: プロジェクト初期化（30分）

```bash
# 1. Next.js プロジェクト作成
npx create-next-app@latest zenx-request \
  --typescript \
  --tailwind \
  --app \
  --src-dir=false \
  --import-alias="@/*"

cd zenx-request

# 2. 依存関係
npm install @supabase/supabase-js @supabase/ssr
npm install @anthropic-ai/sdk
npm install zod react-hook-form @hookform/resolvers
npm install swr
npm install @tanstack/react-table

# 3. shadcn/ui 初期化
npx shadcn@latest init
# → Prompts:
# Style: Default
# Base color: Slate
# CSS variables: Yes

# 4. コンポーネント一括追加
npx shadcn@latest add button card input textarea select badge
npx shadcn@latest add table dialog alert separator label
npx shadcn@latest add radio-group checkbox
npx shadcn@latest add command popover progress

# 5. next.config.js を standalone モードに設定（Cloud Run用）
```

**Phase 0 完了確認**: `npm run dev` でデフォルト画面が表示される

---

## Phase 1: 認証基盤（1〜2時間）

### 1-1. Supabase プロジェクト設定

```
Supabase ダッシュボードで:
1. 新規プロジェクト作成（Region: ap-northeast-1）
2. Authentication → Providers:
   - Email: Enable, Confirm email: ON
   - Google: Enable → Client ID/Secret を設定
3. Google Cloud Console でOAuth認証情報作成:
   - Authorized redirect URIs: https://{project}.supabase.co/auth/v1/callback
```

### 1-2. DBマイグレーション

```
Supabase SQL Editor で以下を順に実行:
1. DATABASE.md → 001_create_users.sql
2. DATABASE.md → 002_create_feature_requests.sql
3. DATABASE.md → 003_create_chat_messages.sql
4. DATABASE.md → 004_create_request_sheets.sql
5. DATABASE.md → 005_create_responses.sql
```

### 1-3. 実装ファイル

```
実装対象:
- /lib/supabase/client.ts      （ブラウザ用クライアント）
- /lib/supabase/server.ts      （Server Components用）
- middleware.ts                （認証ガード）
- /app/(auth)/login/page.tsx   （ログイン画面）
- /app/auth/callback/route.ts  （OAuth コールバック）
```

**ログイン画面の要件:**
- ダークネイビー背景、中央カード
- 「Googleでログイン」ボタン（Google色 or Primary色）
- メール/パスワードフォーム（Zod バリデーション）
- GenX ロゴ or "ZENX Request" テキストロゴ
- エラーメッセージ表示（invalid credentials 等）

**Phase 1 完了確認**: Googleログイン/メールログインができ、/dashboardにリダイレクトされる

---

## Phase 2: レイアウト・ダッシュボード（1〜2時間）

### 2-1. 実装ファイル

```
- /components/layout/Sidebar.tsx
- /components/layout/Header.tsx
- /app/(app)/layout.tsx
- /app/(app)/dashboard/page.tsx
```

### 2-2. Sidebar 要件

```
- 固定幅 240px
- ロゴ: "ZENX Request" （テキスト or SVG）
- ナビ項目:
  - ダッシュボード（全ロール）
  - 新規要望登録（sales のみ）
  - 管理画面（admin のみ）
- ユーザー情報（名前・ロール表示）
- ログアウトボタン
- アクティブ状態のハイライト
```

### 2-3. Dashboard 要件

```
KPIカード（4枚グリッド）:
- 全要望数
- AI質問中（status: chatting）
- レビュー待ち（status: under_review）
- 返答済み（status: responded）

要望一覧テーブル（TanStack Table）:
- 列: 顧客名 / 優先度 / ステータス / プロダクト / 作成日 / アクション
- ソート: 全列
- フィルター: ステータス + 優先度 + キーワード
- ロール別表示:
  - sales: 自分が作成した要望のみ
  - engineer/bizdev/admin: 全件 + アサイン済みのみフィルター可
- 行クリック → /requests/[id] に遷移
```

**Phase 2 完了確認**: ダッシュボードが表示され、サイドバーナビが機能する

---

## Phase 3: 新規要望登録フォーム（2〜3時間）

### 3-1. 実装ファイル

```
- /app/(app)/requests/new/page.tsx
- /components/features/request-form/RequestForm.tsx
- /components/features/request-form/AsanaTaskSearch.tsx
- /components/features/request-form/PrioritySelector.tsx
- /schemas/requestSchema.ts
- /app/api/requests/route.ts
- /app/api/asana/tasks/route.ts
- /hooks/useAsanaTasks.ts
```

### 3-2. フォーム UI 要件

```
Step 1 - フォーム:
┌─────────────────────────────────────┐
│  新規機能要望登録                      │
├─────────────────────────────────────┤
│  顧客名*          [_______________]  │
│  対象プロダクト*   [Select ▼]        │
│  契約ステータス*   ○契約前 ○交渉中 ○契約済み │
│  優先度*          🔴高 🟡中 🟢低     │
│                   （ラジオ or カード型）│
│  Asana 親タスク   [🔍 顧客名で検索] │
│                   （任意・スキップ可） │
│  要望の内容*                          │
│  [                               ]  │
│  [  顧客から言われたことをそのまま    ]  │
│  [  書いてください（AI が整理します）  ]  │
│                                     │
│              [次へ → AIと整理する]   │
└─────────────────────────────────────┘

Asana検索コンポーネント（AsanaTaskSearch）:
- Popover + Command（shadcn/ui）を使用
- SWR で /api/asana/tasks をキャッシュ
- Input onChange でローカル filter（debounce不要）
- 「タスクを選択しない」オプション
```

**Phase 3 完了確認**: フォームが送信でき、feature_requestsテーブルにレコードが作成される

---

## Phase 4: AIチャット（3〜4時間）

### 4-1. 実装ファイル

```
- /app/api/chat/route.ts
- /components/features/chat/ChatWindow.tsx
- /components/features/chat/ChatMessage.tsx
- /components/features/chat/ChecklistProgress.tsx
- /lib/anthropic/client.ts
- /lib/utils/sheetParser.ts
```

### 4-2. チャット UI 要件

```
Step 2 - AIチャット:
┌─────────────────────────────────────┐
│  TIER1進捗 [████████░░] 4/5         │
│  TIER2進捗 [██░░░░░░░░] 1/5         │
├─────────────────────────────────────┤
│  [AI] ご要望の内容を確認させてください。   │
│       現在の状況として、〇〇は...         │
│                                     │
│  [あなた] はい、現在は手動でExcelに...   │
│                                     │
│  [AI] ありがとうございます。次に...       │
├─────────────────────────────────────┤
│  [___________________________] [送信] │
└─────────────────────────────────────┘

SHEET_COMPLETE 検出時:
- チャット欄の下に「✅ リクエストシート完成」バナーを表示
- 「シートを確認する」ボタン → モーダルでプレビュー
- 「Asanaに送信する」ボタン → 担当者選択 → サブタスク作成
```

**Phase 4 完了確認**: AIと往復できてSHEET_COMPLETEが検出されDBに保存される

---

## Phase 5: Asanaサブタスク作成（1時間）

### 5-1. 実装ファイル

```
- /app/api/asana/subtask/route.ts
- /app/api/asana/members/route.ts  （担当者一覧）
- /lib/asana/client.ts
- /lib/utils/businessDays.ts
- /components/features/chat/AsanaConfirmModal.tsx
```

### 5-2. Asana送信フロー UI

```
モーダル（AsanaConfirmModal）:
- 担当者選択（Select: Asanaメンバー一覧）
- 期日プレビュー（「2営業日後: 2026年3月24日（火）」）
- リクエストシートプレビュー（スクロール可能エリア）
- 「Asanaに送信」ボタン（送信後: ボタン → ✅ 送信済み）
```

**Phase 5 完了確認**: Asanaの親タスクにサブタスクが作成される

---

## Phase 6: 詳細ページ・返答フロー（2〜3時間）

### 6-1. 実装ファイル

```
- /app/(app)/requests/[id]/page.tsx
- /components/features/request-sheet/RequestSheet.tsx
- /components/features/response/ResponseForm.tsx
- /components/features/response/ResponseThread.tsx
- /app/api/responses/route.ts
```

### 6-2. 詳細ページ UI 要件

```
2カラムレイアウト:
┌──────────────────┬────────────────┐
│ リクエストシート  │ 返答スレッド    │
│ （70%）          │ （30%）         │
│                  │                │
│ ■ 要望サマリー   │ [返答を書く]    │
│ ■ 現状の対応     │ 質問/確認事項   │
│ ■ 期待する動作   │ [_____________] │
│ ■ 対象ユーザー   │ 見積金額 (任意) │
│ ...              │ [_____________] │
│                  │ 見積期間 (任意) │
│ 🔗 Asanaリンク   │ [_____________] │
│                  │ 実現可否        │
│                  │ ○可能 ○条件付 ○困難 │
│                  │ [送信]          │
│                  ├────────────────│
│                  │ 過去の返答     │
│                  │ [返答1]         │
│                  │ [返答2]         │
└──────────────────┴────────────────┘

salesロール: 返答フォームは非表示（スレッドのみ表示）
```

**Phase 6 完了確認**: エンジニアが返答を送信でき、salesに表示される

---

## Phase 7: 管理画面・仕上げ（1〜2時間）

### 7-1. 管理画面

```
/admin（adminロールのみ）:
- ユーザー一覧テーブル（名前・メール・ロール）
- ロール変更（Select → 即時保存）
- Asana User GID 登録（テキスト入力）
```

### 7-2. 最終確認チェックリスト

```
□ 全ページで日本語UIになっているか
□ ロール別表示制御が正しく機能しているか
□ Zod バリデーションエラーが適切に表示されるか
□ API エラー時にユーザーへフィードバックが表示されるか
□ Asana連携なしでもフローが完結するか（スキップパス）
□ レスポンシブ: モバイルでサイドバーが崩れないか
□ .env.local.example にすべての環境変数が記載されているか
```

---

## Phase 8: GCP デプロイ（1〜2時間）

```bash
# 1. GCP プロジェクト設定
gcloud config set project YOUR_PROJECT_ID

# 2. 必要なAPIを有効化
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# 3. Artifact Registry リポジトリ作成
gcloud artifacts repositories create zenx-request \
  --repository-format=docker \
  --location=asia-northeast1

# 4. Secret Manager にシークレット登録
echo -n "YOUR_ANTHROPIC_KEY" | gcloud secrets create ANTHROPIC_API_KEY --data-file=-
echo -n "YOUR_SUPABASE_SERVICE_KEY" | gcloud secrets create SUPABASE_SERVICE_ROLE_KEY --data-file=-
echo -n "YOUR_ASANA_TOKEN" | gcloud secrets create ASANA_ACCESS_TOKEN --data-file=-

# 5. Cloud Build でイメージビルド & Cloud Run デプロイ
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_SUPABASE_URL="https://xxx.supabase.co",_SUPABASE_ANON_KEY="eyJ..."

# 6. カスタムドメイン設定（任意）
gcloud run domain-mappings create \
  --service zenx-request \
  --domain request.genxinc.ai \
  --region asia-northeast1
```

**Phase 8 完了確認**: Cloud Runの発行URLからアプリにアクセスできる
