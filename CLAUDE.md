# ZENX Request — Claude Code Master Instructions

## プロジェクト概要

GenX株式会社の社内機能要望管理アプリ「ZENX Request」を構築する。
営業担当が顧客からの機能要望を入力 → AIが質問往復でリクエストシートを完成 → Asanaにサブタスク自動生成 → エンジニア/BizDevが見積・返答するフローを実現する。

---

## 絶対ルール（最優先）

1. **UIテキストは全て日本語（丁寧語）**。コード・変数名・コメントは英語
2. **shadcn/ui コンポーネントを必ず使用**。独自スタイルコンポーネントを新規発明しない
3. **型安全を保つ**。`any` 型の使用禁止。全てのAPIレスポンスに型定義を作成
4. **エラーハンドリングを必ず実装**。全API呼び出しにtry/catch、ユーザーへのフィードバック必須
5. **環境変数は `.env.local` で管理**。ハードコード禁止

---

## 参照ドキュメント（実装前に必ず読むこと）

| ファイル | 内容 |
|---|---|
| `docs/ARCHITECTURE.md` | システム全体構成・GCP構成 |
| `docs/DATABASE.md` | Supabase スキーマ定義 |
| `docs/API.md` | API Routes 仕様 |
| `docs/DESIGN_SYSTEM.md` | デザイントークン・コンポーネント規約 |
| `docs/AI_PROMPT.md` | AIチャット システムプロンプト |
| `docs/ASANA.md` | Asana API 連携仕様 |
| `docs/IMPLEMENTATION_PLAN.md` | フェーズ別実装順序 |

---

## 技術スタック

```
Frontend    Next.js 14 (App Router) + TypeScript
Styling     Tailwind CSS + shadcn/ui
State       React hooks + SWR (server state)
Validation  Zod
Auth        Supabase Auth (Google OAuth + Email/Password)
Database    Supabase PostgreSQL (Cloud SQL互換)
AI          Anthropic API (claude-sonnet-4-20250514)
Asana       Asana REST API v1
Hosting     GCP Cloud Run (コンテナ)
CI/CD       Cloud Build
Secrets     GCP Secret Manager
```

---

## プロジェクト構造

```
zenx-request/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (app)/
│   │   ├── layout.tsx          # サイドバー共通レイアウト
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── requests/
│   │   │   ├── new/
│   │   │   │   └── page.tsx    # フォーム + AIチャット
│   │   │   └── [id]/
│   │   │       └── page.tsx    # 詳細 + 返答
│   │   └── admin/
│   │       └── page.tsx
│   └── api/
│       ├── chat/
│       │   └── route.ts        # AI往復エンドポイント
│       ├── requests/
│       │   └── route.ts
│       ├── asana/
│       │   ├── tasks/
│       │   │   └── route.ts    # プロジェクトタスク一覧
│       │   └── subtask/
│       │       └── route.ts    # サブタスク作成
│       └── responses/
│           └── route.ts
├── components/
│   ├── primitives/             # shadcn/ui ラッパー
│   │   ├── AppButton.tsx
│   │   ├── AppBadge.tsx
│   │   └── AppCard.tsx
│   ├── features/
│   │   ├── request-form/
│   │   │   ├── RequestForm.tsx
│   │   │   ├── AsanaTaskSearch.tsx
│   │   │   └── PrioritySelector.tsx
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   └── ChecklistProgress.tsx
│   │   ├── request-sheet/
│   │   │   ├── RequestSheet.tsx
│   │   │   └── SheetField.tsx
│   │   └── response/
│   │       ├── ResponseForm.tsx
│   │       └── ResponseThread.tsx
│   └── layout/
│       ├── Sidebar.tsx
│       └── Header.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── anthropic/
│   │   └── client.ts
│   ├── asana/
│   │   └── client.ts
│   └── utils/
│       ├── businessDays.ts     # 2営業日計算
│       └── sheetParser.ts      # AIレスポンスパーサー
├── types/
│   ├── database.ts             # Supabase生成型
│   ├── request.ts
│   └── asana.ts
├── hooks/
│   ├── useRequests.ts
│   └── useAsanaTasks.ts
├── docs/                       # 本ドキュメント群
├── Dockerfile
├── .env.local.example
└── cloudbuild.yaml
```

---

## 環境変数一覧

```bash
# .env.local.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Asana
ASANA_ACCESS_TOKEN=
ASANA_WORKSPACE_GID=
ASANA_SALES_PROJECT_GID=   # 営業案件管理プロジェクトのGID

# GCP
GCP_PROJECT_ID=
```

---

## 実装開始コマンド

```bash
# 1. プロジェクト初期化
npx create-next-app@latest zenx-request --typescript --tailwind --app --src-dir=false

# 2. 依存関係インストール
cd zenx-request
npm install @supabase/supabase-js @supabase/ssr
npm install @anthropic-ai/sdk
npm install zod react-hook-form @hookform/resolvers
npm install swr
npm install @tanstack/react-table

# 3. shadcn/ui 初期化
npx shadcn@latest init
# → Style: Default, BaseColor: Slate, CSS variables: Yes

# 4. shadcn/ui コンポーネント追加
npx shadcn@latest add button card input textarea select badge
npx shadcn@latest add table dialog alert separator
npx shadcn@latest add radio-group checkbox label
npx shadcn@latest add command popover

# 5. Supabase型生成（後でDB作成後に実行）
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
```
