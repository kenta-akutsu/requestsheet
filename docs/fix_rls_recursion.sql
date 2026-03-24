-- ============================================
-- RLS無限再帰の修正
-- Supabase SQL Editor に貼り付けて実行してください
-- ============================================

-- 1. admin判定用のヘルパー関数を作成（SECURITY DEFINERでRLSをバイパス）
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. usersテーブルの問題のあるポリシーを削除して再作成
DROP POLICY IF EXISTS "admin_all" ON public.users;

CREATE POLICY "admin_all" ON public.users
  FOR ALL USING (public.is_admin());

-- 3. 他のテーブルのポリシーもヘルパー関数を使うよう更新（安全のため）

-- feature_requests
DROP POLICY IF EXISTS "sales_own" ON public.feature_requests;
CREATE POLICY "sales_own" ON public.feature_requests
  FOR ALL USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('engineer', 'bizdev', 'admin')
    )
  );

-- ============================================
-- 完了！
-- ============================================
