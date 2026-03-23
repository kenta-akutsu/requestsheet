import { z } from 'zod'

export const createResponseSchema = z.object({
  request_id: z.string().uuid(),
  questions: z.string().optional(),
  estimate_amount: z.string().optional(),
  estimate_duration: z.string().optional(),
  feasibility: z.enum(['feasible', 'conditional', 'infeasible'], {
    error: '実現可否を選択してください',
  }),
  notes: z.string().optional(),
})

export type CreateResponseInput = z.infer<typeof createResponseSchema>
