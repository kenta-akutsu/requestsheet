# API.md — API Routes 仕様

## 認証

全エンドポイントで Supabase セッション確認必須。未認証は `401` を返す。

---

## エンドポイント一覧

### `POST /api/requests`
新規機能要望作成

**Request Body:**
```typescript
{
  customer_name: string
  product: 'OCR' | 'TimecardAgent' | 'RAG' | 'Other'
  contract_status: 'pre_contract' | 'negotiating' | 'contracted'
  priority: 'high' | 'medium' | 'low'
  raw_request: string
  asana_parent_task_gid?: string
  asana_parent_task_name?: string
}
```

**Response:** `201`
```typescript
{ request: FeatureRequest }
```

---

### `POST /api/chat`
AIチャット（ストリーミング）

**Request Body:**
```typescript
{
  requestId: string
  messages: Array<{ role: 'user' | 'assistant', content: string }>
}
```

**Response:** `200` `Content-Type: text/plain; charset=utf-8`
- ストリーミングテキスト
- SHEET_COMPLETE 検出時は自動でDBに保存

---

### `GET /api/asana/tasks`
Asana営業案件プロジェクトのタスク一覧

**Response:** `200`
```typescript
{ tasks: Array<{ gid: string, name: string }> }
```

---

### `GET /api/asana/members`
Asanaワークスペースメンバー一覧（担当者選択用）

**Response:** `200`
```typescript
{ members: Array<{ gid: string, name: string, email: string }> }
```

---

### `POST /api/asana/subtask`
Asanaサブタスク作成

**Request Body:**
```typescript
{
  requestId: string
  parentTaskGid: string
  assigneeGid?: string
}
```

**Response:** `201`
```typescript
{ subtask: { gid: string, name: string } }
```

---

### `POST /api/responses`
エンジニア/BizDevからの返答作成

**Request Body:**
```typescript
{
  requestId: string
  questions?: string
  estimate_amount?: string
  estimate_duration?: string
  feasibility: 'feasible' | 'conditional' | 'infeasible'
  notes?: string
}
```

**Response:** `201`
```typescript
{ response: Response }
```

---

## エラーレスポンス形式

```typescript
// 全エンドポイント共通
{
  error: string   // ユーザー表示用日本語メッセージ
  detail?: string // デバッグ用（本番環境では省略）
}
```

| Status | 意味 |
|---|---|
| 400 | バリデーションエラー |
| 401 | 未認証 |
| 403 | 権限なし |
| 404 | リソースが見つからない |
| 500 | サーバーエラー |
