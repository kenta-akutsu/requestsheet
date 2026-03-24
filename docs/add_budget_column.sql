-- request_sheets テーブルに budget カラムを追加
ALTER TABLE public.request_sheets
ADD COLUMN IF NOT EXISTS budget text;

-- コメント
COMMENT ON COLUMN public.request_sheets.budget IS '予算感（TIER1項目）';
