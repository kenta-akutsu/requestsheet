# DATABASE.md — Supabase スキーマ定義

## Supabase プロジェクト設定

- Region: `ap-northeast-1` (東京)
- Auth providers: Google OAuth, Email

---

## マイグレーション SQL

Supabase ダッシュボード → SQL Editor に以下を順番に実行する。

### 001_create_users.sql

```sql
-- usersテーブル（Supabase Authのauth.usersを拡張）
CREATE TABLE public.users (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name        TEXT,
  email       TEXT UNIQUE NOT NULL,
  role        TEXT NOT NULL DEFAULT 'sales'
                CHECK (role IN ('sales', 'engineer', 'bizdev', 'admin')),
  asana_user_gid TEXT,          -- AsanaユーザーGID（担当者アサイン用）
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- auth.usersにユーザーが作成されたとき自動でpublic.usersにも作成
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "admin_all" ON public.users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
```

### 002_create_feature_requests.sql

```sql
CREATE TABLE public.feature_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by          UUID REFERENCES public.users(id) ON DELETE SET NULL,
  customer_name       TEXT NOT NULL,
  sales_owner_name    TEXT,                   -- 入力時点の担当者名（自由記述）
  product             TEXT NOT NULL
                        CHECK (product IN ('OCR', 'TimecardAgent', 'RAG', 'Other')),
  contract_status     TEXT NOT NULL
                        CHECK (contract_status IN ('pre_contract', 'negotiating', 'contracted')),
  priority            TEXT NOT NULL
                        CHECK (priority IN ('high', 'medium', 'low')),
  raw_request         TEXT NOT NULL,          -- 最初の自由記述
  status              TEXT NOT NULL DEFAULT 'chatting'
                        CHECK (status IN ('chatting', 'sheet_complete', 'under_review', 'responded', 'closed')),
  asana_parent_task_gid  TEXT,               -- 営業が選んだ親タスクGID
  asana_parent_task_name TEXT,               -- 表示用タスク名
  asana_subtask_gid      TEXT,               -- 作成されたサブタスクGID
  assigned_to            UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

-- salesは自分が作成した要望のみ閲覧・編集
CREATE POLICY "sales_own" ON public.feature_requests
  FOR ALL USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('engineer', 'bizdev', 'admin')
    )
  );

-- updated_atを自動更新
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.feature_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

### 003_create_chat_messages.sql

```sql
CREATE TABLE public.chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_request_id ON public.chat_messages(request_id);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- feature_requestsにアクセスできるユーザーはチャットも閲覧可
CREATE POLICY "chat_access" ON public.chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.feature_requests fr
      WHERE fr.id = request_id AND (
        fr.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role IN ('engineer', 'bizdev', 'admin')
        )
      )
    )
  );
```

### 004_create_request_sheets.sql

```sql
CREATE TABLE public.request_sheets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id            UUID NOT NULL UNIQUE REFERENCES public.feature_requests(id) ON DELETE CASCADE,

  -- TIER1: 必須項目
  summary               TEXT,   -- 要望の一言要約
  current_workaround    TEXT,   -- 現状のワークアラウンド
  expected_behavior     TEXT,   -- 期待する動作・完了条件
  target_users          TEXT,   -- 対象ユーザー
  target_screen         TEXT,   -- 対象プロダクト・画面・フロー

  -- TIER2: 重要項目
  data_scale            TEXT,   -- データ量・規模感
  external_integrations TEXT,   -- 外部システム連携
  io_format             TEXT,   -- 入出力形式
  security_requirements TEXT,   -- セキュリティ・権限要件
  deadline              TEXT,   -- デッドライン

  -- メタ情報
  business_impact       TEXT,   -- ビジネスインパクト・優先度根拠
  unchecked_items       TEXT,   -- AIが判断した要追確認項目
  tier1_complete        BOOLEAN NOT NULL DEFAULT FALSE,
  tier2_complete        BOOLEAN NOT NULL DEFAULT FALSE,
  raw_json              JSONB,  -- AI出力のフルJSON保存

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_sheets
  BEFORE UPDATE ON public.request_sheets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.request_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sheet_access" ON public.request_sheets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.feature_requests fr
      WHERE fr.id = request_id AND (
        fr.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role IN ('engineer', 'bizdev', 'admin')
        )
      )
    )
  );
```

### 005_create_responses.sql

```sql
CREATE TABLE public.responses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id        UUID NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  responded_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,

  questions         TEXT,             -- 確認・質問事項
  estimate_amount   TEXT,             -- 見積金額（任意、テキストで柔軟に）
  estimate_duration TEXT,             -- 見積期間（例: "2週間", "1ヶ月"）
  feasibility       TEXT
                      CHECK (feasibility IN ('feasible', 'conditional', 'infeasible')),
  notes             TEXT,             -- 備考

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_responses_request_id ON public.responses(request_id);

ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

-- engineer/bizdev/adminのみ作成可
CREATE POLICY "engineer_insert" ON public.responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('engineer', 'bizdev', 'admin')
    )
  );

-- 関連するfeature_requestにアクセスできるユーザーは閲覧可
CREATE POLICY "response_read" ON public.responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.feature_requests fr
      WHERE fr.id = request_id AND (
        fr.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role IN ('engineer', 'bizdev', 'admin')
        )
      )
    )
  );
```

---

## TypeScript 型定義

```typescript
// types/database.ts（Supabase CLIで自動生成するが、手動定義例）

export type UserRole = 'sales' | 'engineer' | 'bizdev' | 'admin'
export type ProductType = 'OCR' | 'TimecardAgent' | 'RAG' | 'Other'
export type ContractStatus = 'pre_contract' | 'negotiating' | 'contracted'
export type Priority = 'high' | 'medium' | 'low'
export type RequestStatus = 'chatting' | 'sheet_complete' | 'under_review' | 'responded' | 'closed'
export type Feasibility = 'feasible' | 'conditional' | 'infeasible'

export interface User {
  id: string
  name: string | null
  email: string
  role: UserRole
  asana_user_gid: string | null
  created_at: string
  updated_at: string
}

export interface FeatureRequest {
  id: string
  created_by: string | null
  customer_name: string
  sales_owner_name: string | null
  product: ProductType
  contract_status: ContractStatus
  priority: Priority
  raw_request: string
  status: RequestStatus
  asana_parent_task_gid: string | null
  asana_parent_task_name: string | null
  asana_subtask_gid: string | null
  assigned_to: string | null
  created_at: string
  updated_at: string
  // JOIN
  creator?: User
  assignee?: User
  request_sheet?: RequestSheet
  responses?: Response[]
}

export interface ChatMessage {
  id: string
  request_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface RequestSheet {
  id: string
  request_id: string
  summary: string | null
  current_workaround: string | null
  expected_behavior: string | null
  target_users: string | null
  target_screen: string | null
  data_scale: string | null
  external_integrations: string | null
  io_format: string | null
  security_requirements: string | null
  deadline: string | null
  business_impact: string | null
  unchecked_items: string | null
  tier1_complete: boolean
  tier2_complete: boolean
  raw_json: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface Response {
  id: string
  request_id: string
  responded_by: string | null
  questions: string | null
  estimate_amount: string | null
  estimate_duration: string | null
  feasibility: Feasibility | null
  notes: string | null
  created_at: string
  responder?: User
}
```
