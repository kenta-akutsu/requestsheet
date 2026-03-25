import { z } from 'zod'

export const createBugReportSchema = z.object({
  product: z.enum(['OCR', 'TimecardAgent', 'NandemonAI', 'AIConsulting', 'Other'], {
    error: 'プロダクトを選択してください',
  }),
  is_production_user: z.boolean({
    error: '本番契約済みかどうかを選択してください',
  }),
  reproducibility: z.enum(['reproducible', 'not_reproducible', 'no_environment'], {
    error: 'バグの再現性を選択してください',
  }),
  what_action: z.string().min(1, '「何を」を入力してください'),
  where_page: z.string().min(1, '「どのページのどの箇所で」を入力してください'),
  what_happened: z.string().min(1, '「なにが」を入力してください'),
  expected_result: z.string().min(1, '「どうなった」を入力してください'),
  os_environments: z.array(z.enum(['windows', 'mac', 'linux'])).min(1, 'OS環境を1つ以上選択してください'),
  browser_environments: z.array(z.enum(['chrome', 'edge', 'safari', 'firefox', 'brave'])).min(1, 'ブラウザ環境を1つ以上選択してください'),
  page_url: z.string().nullable().optional(),
  file_format: z.string().nullable().optional(),
  execution_id: z.string().nullable().optional(),
  asana_task_gid: z.string().optional(),
  asana_task_name: z.string().optional(),
})

export type CreateBugReportInput = z.infer<typeof createBugReportSchema>
