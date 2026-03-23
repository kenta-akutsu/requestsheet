# DESIGN_SYSTEM.md — デザインシステム規約

## 基本方針（b2b_design_skill 準拠）

- **Desktop-First**。モバイルはレスポンシブで崩れない程度に対応
- **情報密度を重視**。日本のB2Bユーザーは情報量の多いUIに慣れている
- **Don't Make Me Think**（Steve Krug）。全ての要素に明確な目的を持たせる
- **コンポーネントライブラリ**: `shadcn/ui` のみ使用。独自コンポーネント発明禁止
- **UIテキストは全て日本語（丁寧語）**

---

## カラートークン (`/app/globals.css`)

```css
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap');

@layer base {
  :root {
    /* ライトモード（基本はダークモード） */
    --background: 222 47% 11%;
    --foreground: 210 40% 98%;
    --card: 222 47% 14%;
    --card-foreground: 210 40% 98%;
    --popover: 222 47% 14%;
    --popover-foreground: 210 40% 98%;
    --primary: 217 91% 60%;          /* Electric Blue #3B82F6 */
    --primary-foreground: 0 0% 100%;
    --secondary: 217 33% 25%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217 33% 20%;
    --muted-foreground: 215 20% 65%;
    --accent: 217 33% 22%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 84% 60%;        /* Red #EF4444 */
    --destructive-foreground: 0 0% 100%;
    --border: 217 33% 22%;
    --input: 217 33% 22%;
    --ring: 217 91% 60%;
    --radius: 0.5rem;

    /* セマンティックカラー（shadcn外） */
    --success: 142 71% 45%;          /* Green #22C55E */
    --success-foreground: 0 0% 100%;
    --warning: 38 92% 50%;           /* Amber #F59E0B */
    --warning-foreground: 0 0% 0%;
    --priority-high: 0 84% 60%;      /* Red */
    --priority-medium: 38 92% 50%;   /* Amber */
    --priority-low: 142 71% 45%;     /* Green */
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif;
  }
}
```

## Tailwind 設定 (`tailwind.config.ts`)

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        success: { DEFAULT: 'hsl(var(--success))', foreground: 'hsl(var(--success-foreground))' },
        warning: { DEFAULT: 'hsl(var(--warning))', foreground: 'hsl(var(--warning-foreground))' },
      },
      fontFamily: {
        sans: ['Noto Sans JP', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
```

---

## コンポーネント抽象化規約

**shadcn/ui コンポーネントを直接ページで使わない。必ずラッパーを作る。**

### AppButton (`/components/primitives/AppButton.tsx`)

```tsx
import { Button, ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AppButtonProps extends ButtonProps {
  loading?: boolean
}

export function AppButton({ loading, children, disabled, className, ...props }: AppButtonProps) {
  return (
    <Button
      disabled={disabled || loading}
      className={cn(loading && 'opacity-70 cursor-not-allowed', className)}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
          処理中...
        </span>
      ) : children}
    </Button>
  )
}
```

### StatusBadge (`/components/primitives/AppBadge.tsx`)

```tsx
import { Badge } from '@/components/ui/badge'
import type { RequestStatus, Priority } from '@/types/database'

const STATUS_LABEL: Record<RequestStatus, string> = {
  chatting: 'AI質問中',
  sheet_complete: 'シート完成',
  under_review: 'レビュー待ち',
  responded: '返答済み',
  closed: 'クローズ',
}

const STATUS_VARIANT: Record<RequestStatus, string> = {
  chatting: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  sheet_complete: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  under_review: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  responded: 'bg-green-500/20 text-green-300 border-green-500/30',
  closed: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
}

const PRIORITY_LABEL: Record<Priority, string> = {
  high: '🔴 優先度高',
  medium: '🟡 優先度中',
  low: '🟢 優先度低',
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_VARIANT[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className="inline-flex items-center text-xs font-medium">
      {PRIORITY_LABEL[priority]}
    </span>
  )
}
```

---

## レイアウト構造

### サイドバー (`/components/layout/Sidebar.tsx`)

```
構造:
├── ロゴ（ZENX Request）
├── ナビゲーション
│   ├── ダッシュボード
│   ├── 新規要望登録（salesのみ表示）
│   └── 管理（adminのみ表示）
└── ユーザー情報・ログアウト

スタイル:
- 幅: 240px（固定）
- 背景: hsl(var(--card))
- 右ボーダー: border-r border-border
- アクティブリンク: bg-accent text-accent-foreground
```

### メインレイアウト (`/app/(app)/layout.tsx`)

```tsx
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
```

---

## ページ別UIガイドライン

### ダッシュボード (`/dashboard`)

- KPIカード（4枚）: 全要望数 / AI質問中 / レビュー待ち / 返答済み
- テーブル: TanStack Table + shadcn/ui Table
  - 列: 顧客名 / 優先度 / ステータス / プロダクト / 作成日 / アクション
  - フィルター: ステータス(Select) + 優先度(Select) + フリーワード(Input)
  - アクティブフィルターは `Badge` で表示

### 新規要望登録 (`/requests/new`)

- Step 1: フォーム（Card内に収める）
  - Hick's Law適用: 優先度・ステータスは視覚的に区別しやすく
- Step 2: AIチャットウィンドウ
  - 進捗バー（TIER1/TIER2充足率をプログレスバーで表示）
  - チャット履歴（白背景:ユーザー / 青背景:AI）
  - 入力欄は画面下部に固定

### 詳細ページ (`/requests/[id]`)

- 2カラムレイアウト（左: リクエストシート 70% / 右: 返答スレッド 30%）
- モバイルでは1カラムに折り畳み

---

## アクセシビリティ要件（WCAG 2.1 AA）

- コントラスト比: テキスト 4.5:1 以上
- キーボードナビゲーション: 全インタラクティブ要素がtab/enterで操作可能
- フォーカスリング: `ring-2 ring-ring ring-offset-2`
- エラーメッセージ: 赤色だけでなく文字で明示（色盲対応）
- `aria-label` を適切に設定

---

## フォームバリデーション規約

**全フォームにZodスキーマを定義。react-hook-form と組み合わせて使う。**

```typescript
// schemas/requestSchema.ts
import { z } from 'zod'

export const createRequestSchema = z.object({
  customer_name: z.string().min(1, '顧客名を入力してください'),
  product: z.enum(['OCR', 'TimecardAgent', 'RAG', 'Other'], {
    required_error: 'プロダクトを選択してください',
  }),
  contract_status: z.enum(['pre_contract', 'negotiating', 'contracted'], {
    required_error: '契約ステータスを選択してください',
  }),
  priority: z.enum(['high', 'medium', 'low'], {
    required_error: '優先度を選択してください',
  }),
  raw_request: z.string().min(10, '要望は10文字以上で入力してください'),
  asana_parent_task_gid: z.string().optional(),
  asana_parent_task_name: z.string().optional(),
})

export type CreateRequestInput = z.infer<typeof createRequestSchema>
```

エラーメッセージは `FormMessage` コンポーネントで該当フィールドの直下に表示。
