-- ============================================
-- RequestSheet — 全テーブル作成マイグレーション
-- Supabase SQL Editor に貼り付けて実行してください
-- ============================================

-- =====================
-- 001: users テーブル
-- =====================
CREATE TABLE public.users (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name        TEXT,
  email       TEXT UNIQUE NOT NULL,
  role        TEXT NOT NULL DEFAULT 'sales'
                CHECK (role IN ('sales', 'engineer', 'bizdev', 'admin')),
  asana_user_gid TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "admin_all" ON public.users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================
-- 002: feature_requests テーブル
-- =====================
CREATE TABLE public.feature_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by          UUID REFERENCES public.users(id) ON DELETE SET NULL,
  customer_name       TEXT NOT NULL,
  sales_owner_name    TEXT,
  product             TEXT NOT NULL
                        CHECK (product IN ('OCR', 'TimecardAgent', 'RAG', 'Other')),
  contract_status     TEXT NOT NULL
                        CHECK (contract_status IN ('pre_contract', 'negotiating', 'contracted')),
  priority            TEXT NOT NULL
                        CHECK (priority IN ('high', 'medium', 'low')),
  raw_request         TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'chatting'
                        CHECK (status IN ('chatting', 'sheet_complete', 'under_review', 'responded', 'closed')),
  asana_parent_task_gid  TEXT,
  asana_parent_task_name TEXT,
  asana_subtask_gid      TEXT,
  assigned_to            UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_own" ON public.feature_requests
  FOR ALL USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('engineer', 'bizdev', 'admin')
    )
  );

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

-- =====================
-- 003: chat_messages テーブル
-- =====================
CREATE TABLE public.chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_request_id ON public.chat_messages(request_id);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

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

-- =====================
-- 004: request_sheets テーブル
-- =====================
CREATE TABLE public.request_sheets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id            UUID NOT NULL UNIQUE REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  summary               TEXT,
  current_workaround    TEXT,
  expected_behavior     TEXT,
  target_users          TEXT,
  target_screen         TEXT,
  data_scale            TEXT,
  external_integrations TEXT,
  io_format             TEXT,
  security_requirements TEXT,
  deadline              TEXT,
  business_impact       TEXT,
  unchecked_items       TEXT,
  tier1_complete        BOOLEAN NOT NULL DEFAULT FALSE,
  tier2_complete        BOOLEAN NOT NULL DEFAULT FALSE,
  raw_json              JSONB,
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

-- =====================
-- 005: responses テーブル
-- =====================
CREATE TABLE public.responses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id        UUID NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  responded_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  questions         TEXT,
  estimate_amount   TEXT,
  estimate_duration TEXT,
  feasibility       TEXT
                      CHECK (feasibility IN ('feasible', 'conditional', 'infeasible')),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_responses_request_id ON public.responses(request_id);

ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "engineer_insert" ON public.responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('engineer', 'bizdev', 'admin')
    )
  );

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

-- ============================================
-- 完了！5テーブル + RLS + トリガーが作成されました
-- ============================================
