'use client'

import { useState, useRef, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createBugReportSchema, type CreateBugReportInput } from '@/schemas/bugReportSchema'
import { AppButton } from '@/components/primitives/AppButton'
import { useAsanaTasks } from '@/hooks/useAsanaTasks'
import { Search, X, Check, ExternalLink } from 'lucide-react'
import type { BugReproducibility, OsType, BrowserType } from '@/types/database'

const PRODUCTS = [
  { value: 'OCR', label: 'GenX AI OCR' },
  { value: 'TimecardAgent', label: 'タイムカードAIエージェント' },
  { value: 'NandemonAI', label: 'ナンデモンAI' },
  { value: 'AIConsulting', label: 'AIを利用したシステム開発のご相談' },
  { value: 'Other', label: 'その他' },
] as const

const REPRODUCIBILITY_OPTIONS: { value: BugReproducibility; label: string }[] = [
  { value: 'reproducible', label: '有り' },
  { value: 'not_reproducible', label: 'なし' },
  { value: 'no_environment', label: '再現できる環境がなかった' },
]

const OS_OPTIONS: { value: OsType; label: string }[] = [
  { value: 'windows', label: 'Windows' },
  { value: 'mac', label: 'Mac' },
  { value: 'linux', label: 'Linux' },
]

const BROWSER_OPTIONS: { value: BrowserType; label: string }[] = [
  { value: 'chrome', label: 'Chrome' },
  { value: 'edge', label: 'Edge' },
  { value: 'safari', label: 'Safari' },
  { value: 'firefox', label: 'Firefox' },
  { value: 'brave', label: 'Brave' },
]

interface BugReportFormProps {
  onComplete: (bugReportId: string) => void
}

export function BugReportForm({ onComplete }: BugReportFormProps) {
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [asanaTask, setAsanaTask] = useState<{ gid: string; name: string } | null>(null)
  const [pageUrlNa, setPageUrlNa] = useState(false)
  const [fileFormatNa, setFileFormatNa] = useState(false)
  const [executionIdNa, setExecutionIdNa] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateBugReportInput>({
    resolver: zodResolver(createBugReportSchema),
    defaultValues: {
      os_environments: [],
      browser_environments: [],
      is_production_user: undefined,
    },
  })

  async function onSubmit(data: CreateBugReportInput) {
    setLoading(true)
    setApiError(null)
    try {
      const payload = {
        ...data,
        page_url: pageUrlNa ? null : (data.page_url || null),
        file_format: fileFormatNa ? null : (data.file_format || null),
        execution_id: executionIdNa ? null : (data.execution_id || null),
        asana_task_gid: asanaTask?.gid,
        asana_task_name: asanaTask?.name,
      }
      const res = await fetch('/api/bugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '作成に失敗しました')
      onComplete(json.bugReport.id)
    } catch (e) {
      setApiError(e instanceof Error ? e.message : '予期しないエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {apiError && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {apiError}
        </div>
      )}

      {/* Product */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">対象プロダクト *</label>
        <select
          {...register('product')}
          className="w-full px-3 py-2 rounded-md bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">選択してください</option>
          {PRODUCTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        {errors.product && <p className="text-destructive text-xs mt-1">{errors.product.message}</p>}
      </div>

      {/* Asana Task */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Asana 関連タスク
        </label>
        <AsanaTaskSelector value={asanaTask} onChange={setAsanaTask} />
      </div>

      {/* Is Production User */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">本番契約済みのユーザー環境か *</label>
        <Controller
          name="is_production_user"
          control={control}
          render={({ field }) => (
            <div className="flex gap-3">
              {[
                { value: true, label: 'Yes' },
                { value: false, label: 'No' },
              ].map(opt => (
                <label key={String(opt.value)} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={field.value === opt.value}
                    onChange={() => field.onChange(opt.value)}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-foreground">{opt.label}</span>
                </label>
              ))}
            </div>
          )}
        />
        {errors.is_production_user && <p className="text-destructive text-xs mt-1">{errors.is_production_user.message}</p>}
      </div>

      {/* Reproducibility */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">バグの再現性 *</label>
        <div className="flex gap-3 flex-wrap">
          {REPRODUCIBILITY_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value={opt.value}
                {...register('reproducibility')}
                className="text-primary focus:ring-primary"
              />
              <span className="text-sm text-foreground">{opt.label}</span>
            </label>
          ))}
        </div>
        {errors.reproducibility && <p className="text-destructive text-xs mt-1">{errors.reproducibility.message}</p>}
      </div>

      {/* Summary Section */}
      <div className="space-y-4 p-4 rounded-lg border border-border bg-muted/30">
        <h3 className="text-sm font-semibold text-foreground">概要 *</h3>
        <p className="text-xs text-muted-foreground -mt-2">すべて必須項目です</p>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">「何を」実施した際に</label>
          <input
            {...register('what_action')}
            placeholder="例: PDFファイルをアップロードして解析を実行"
            className="w-full px-3 py-2 rounded-md bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.what_action && <p className="text-destructive text-xs mt-1">{errors.what_action.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">「どのページのどの箇所で」</label>
          <input
            {...register('where_page')}
            placeholder="例: ダッシュボード画面の解析結果一覧テーブル"
            className="w-full px-3 py-2 rounded-md bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.where_page && <p className="text-destructive text-xs mt-1">{errors.where_page.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">「なにが」</label>
          <input
            {...register('what_happened')}
            placeholder="例: 解析結果のテキストが文字化けして表示される"
            className="w-full px-3 py-2 rounded-md bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.what_happened && <p className="text-destructive text-xs mt-1">{errors.what_happened.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">「どうなった」</label>
          <input
            {...register('expected_result')}
            placeholder="例: 正常に日本語テキストとして表示されるべきだった"
            className="w-full px-3 py-2 rounded-md bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.expected_result && <p className="text-destructive text-xs mt-1">{errors.expected_result.message}</p>}
        </div>
      </div>

      {/* OS Environments */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">問題が発生したOS環境 *（該当するもの全てにチェック）</label>
        <Controller
          name="os_environments"
          control={control}
          render={({ field }) => (
            <div className="flex gap-4 flex-wrap">
              {OS_OPTIONS.map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.value?.includes(opt.value) || false}
                    onChange={(e) => {
                      const current = field.value || []
                      if (e.target.checked) {
                        field.onChange([...current, opt.value])
                      } else {
                        field.onChange(current.filter(v => v !== opt.value))
                      }
                    }}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-foreground">{opt.label}</span>
                </label>
              ))}
            </div>
          )}
        />
        {errors.os_environments && <p className="text-destructive text-xs mt-1">{errors.os_environments.message}</p>}
      </div>

      {/* Browser Environments */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">ブラウザ環境 *（該当するもの全てにチェック）</label>
        <Controller
          name="browser_environments"
          control={control}
          render={({ field }) => (
            <div className="flex gap-4 flex-wrap">
              {BROWSER_OPTIONS.map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.value?.includes(opt.value) || false}
                    onChange={(e) => {
                      const current = field.value || []
                      if (e.target.checked) {
                        field.onChange([...current, opt.value])
                      } else {
                        field.onChange(current.filter(v => v !== opt.value))
                      }
                    }}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-foreground">{opt.label}</span>
                </label>
              ))}
            </div>
          )}
        />
        {errors.browser_environments && <p className="text-destructive text-xs mt-1">{errors.browser_environments.message}</p>}
      </div>

      {/* Page URL */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">問題が発生したページのURL</label>
        <div className="flex items-center gap-3 mb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={pageUrlNa}
              onChange={(e) => {
                setPageUrlNa(e.target.checked)
                if (e.target.checked) setValue('page_url', null)
              }}
              className="rounded text-primary focus:ring-primary"
            />
            <span className="text-sm text-muted-foreground">該当なし</span>
          </label>
        </div>
        {!pageUrlNa && (
          <input
            {...register('page_url')}
            placeholder="https://..."
            className="w-full px-3 py-2 rounded-md bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        )}
      </div>

      {/* File Format */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">処理した対象のファイル形式</label>
        <div className="flex items-center gap-3 mb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={fileFormatNa}
              onChange={(e) => {
                setFileFormatNa(e.target.checked)
                if (e.target.checked) setValue('file_format', null)
              }}
              className="rounded text-primary focus:ring-primary"
            />
            <span className="text-sm text-muted-foreground">該当なし</span>
          </label>
        </div>
        {!fileFormatNa && (
          <input
            {...register('file_format')}
            placeholder="例: PDF, JPEG, PNG, XLSX"
            className="w-full px-3 py-2 rounded-md bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        )}
      </div>

      {/* Execution ID */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">処理実行時のID</label>
        <div className="flex items-center gap-3 mb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={executionIdNa}
              onChange={(e) => {
                setExecutionIdNa(e.target.checked)
                if (e.target.checked) setValue('execution_id', null)
              }}
              className="rounded text-primary focus:ring-primary"
            />
            <span className="text-sm text-muted-foreground">該当なし</span>
          </label>
        </div>
        {!executionIdNa && (
          <input
            {...register('execution_id')}
            placeholder="例: exec-abc123"
            className="w-full px-3 py-2 rounded-md bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        )}
      </div>

      <AppButton type="submit" loading={loading} className="w-full">
        機能改修要望を登録する
      </AppButton>
    </form>
  )
}

// ---------- Asana Task Selector with "新規登録" button ----------

function AsanaTaskSelector({
  value,
  onChange,
}: {
  value: { gid: string; name: string } | null
  onChange: (value: { gid: string; name: string } | null) => void
}) {
  const { tasks, isLoading, error } = useAsanaTasks()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = tasks.filter(t =>
    t.name.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (value) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-background border border-input text-sm">
        <span className="flex-1 truncate text-foreground">{value.name}</span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setIsOpen(true) }}
            onFocus={() => setIsOpen(true)}
            placeholder="Asanaタスクを検索..."
            className="w-full pl-9 pr-3 py-2 rounded-md bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-auto">
            <button
              type="button"
              onClick={() => { onChange(null); setIsOpen(false); setQuery('') }}
              className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50"
            >
              タスクを選択しない
            </button>
            {isLoading && <p className="px-3 py-2 text-sm text-muted-foreground">読み込み中...</p>}
            {error && <p className="px-3 py-2 text-sm text-destructive">Asanaの接続に失敗しました</p>}
            {filtered.map((task) => (
              <button
                key={task.gid}
                type="button"
                onClick={() => {
                  onChange({ gid: task.gid, name: task.name })
                  setIsOpen(false)
                  setQuery('')
                }}
                className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent/50 truncate"
              >
                {task.name}
              </button>
            ))}
            {!isLoading && !error && filtered.length === 0 && query && (
              <p className="px-3 py-2 text-sm text-muted-foreground">該当するタスクがありません</p>
            )}
          </div>
        )}
      </div>
      <a
        href="https://app.asana.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
      >
        <ExternalLink className="h-3 w-3" />
        案件を新規登録（Asanaを開く）
      </a>
    </div>
  )
}
