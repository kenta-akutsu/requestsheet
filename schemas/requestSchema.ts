import { z } from 'zod'

export const createRequestSchema = z.object({
  customer_name: z.string().min(1, '顧客名を入力してください'),
  product: z.enum(['OCR', 'TimecardAgent', 'NandemonAI', 'AIConsulting', 'Other'], {
    error: 'プロダクトを選択してください',
  }),
  contract_status: z.enum(['pre_contract', 'negotiating', 'contracted'], {
    error: '契約ステータスを選択してください',
  }),
  priority: z.enum(['high', 'medium', 'low'], {
    error: '優先度を選択してください',
  }),
  raw_request: z.string().min(10, '要望は10文字以上で入力してください'),
  asana_parent_task_gid: z.string().optional(),
  asana_parent_task_name: z.string().optional(),
})

export type CreateRequestInput = z.infer<typeof createRequestSchema>
