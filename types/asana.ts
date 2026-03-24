export interface AsanaTask {
  gid: string
  name: string
  resource_type: 'task'
}

export interface AsanaUser {
  gid: string
  name: string
  email: string
  resource_type: 'user'
}

// 開発ボードのタスク（詳細情報付き）
export interface AsanaDevTask {
  gid: string
  name: string
  notes: string
  completed: boolean
  assignee: string | null
  dueOn: string | null
  section: string | null  // ボードのセクション名（例: "開発中", "完了", "バックログ"）
}

export interface CreateSubtaskParams {
  name: string
  assignee?: string
  due_on?: string
  notes?: string
}
