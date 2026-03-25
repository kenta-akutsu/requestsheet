-- CSロール追加: usersテーブルのrole制約を更新
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('sales', 'engineer', 'bizdev', 'cs', 'admin'));

-- bug_reportsテーブルのRLSにCSロールを追加
-- （bug_reportsテーブル作成時に既にengineer/bizdev/adminで設定済みの場合）
DROP POLICY IF EXISTS "Staff can view all bug_reports" ON bug_reports;
CREATE POLICY "Staff can view all bug_reports"
  ON bug_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('engineer', 'bizdev', 'cs', 'admin')
    )
  );
