-- プロダクトのCHECK制約を更新
-- RAGを削除、NandemonAI と AIConsulting を追加

-- 1. 既存のCHECK制約を削除
ALTER TABLE public.feature_requests DROP CONSTRAINT IF EXISTS feature_requests_product_check;

-- 2. 既存のRAGデータをOtherに変更（もしあれば）
UPDATE public.feature_requests SET product = 'Other' WHERE product = 'RAG';

-- 3. 新しいCHECK制約を追加
ALTER TABLE public.feature_requests
ADD CONSTRAINT feature_requests_product_check
CHECK (product IN ('OCR', 'TimecardAgent', 'NandemonAI', 'AIConsulting', 'Other'));

-- 4. budget カラムを request_sheets に追加（まだの場合）
ALTER TABLE public.request_sheets
ADD COLUMN IF NOT EXISTS budget text;
