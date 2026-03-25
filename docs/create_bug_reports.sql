-- 機能改修要望テーブル作成
CREATE TABLE bug_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product TEXT NOT NULL CHECK (product IN ('OCR', 'TimecardAgent', 'NandemonAI', 'AIConsulting', 'Other')),
  is_production_user BOOLEAN NOT NULL,
  reproducibility TEXT NOT NULL CHECK (reproducibility IN ('reproducible', 'not_reproducible', 'no_environment')),
  what_action TEXT NOT NULL,
  where_page TEXT NOT NULL,
  what_happened TEXT NOT NULL,
  expected_result TEXT NOT NULL,
  os_environments TEXT[] NOT NULL DEFAULT '{}',
  browser_environments TEXT[] NOT NULL DEFAULT '{}',
  page_url TEXT,
  file_format TEXT,
  execution_id TEXT,
  asana_task_gid TEXT,
  asana_task_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS有効化
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーはINSERT可能
CREATE POLICY "Authenticated users can insert bug_reports"
  ON bug_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- 自分の投稿は閲覧可能
CREATE POLICY "Users can view own bug_reports"
  ON bug_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

-- engineer/bizdev/adminは全件閲覧可能
CREATE POLICY "Staff can view all bug_reports"
  ON bug_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('engineer', 'bizdev', 'admin')
    )
  );

-- updated_at自動更新トリガー
CREATE TRIGGER update_bug_reports_updated_at
  BEFORE UPDATE ON bug_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
