import type { AsanaTask, AsanaUser, CreateSubtaskParams, AsanaDevTask } from '@/types/asana'

const ASANA_BASE_URL = 'https://app.asana.com/api/1.0'

// Allowed workspace name (genxinc.ai only)
const ALLOWED_WORKSPACE_NAME = 'genxinc.ai'

// Cache workspace GID to avoid repeated lookups
let cachedWorkspaceGid: string | null = null

async function asanaFetch(path: string, options?: RequestInit) {
  const token = process.env.ASANA_ACCESS_TOKEN
  if (!token) throw new Error('ASANA_ACCESS_TOKEN is not set')

  const res = await fetch(`${ASANA_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(`Asana API error: ${res.status} - ${JSON.stringify(error)}`)
  }
  return res.json()
}

// Get the genxinc.ai workspace GID (auto-discover and cache)
export async function getWorkspaceGid(): Promise<string> {
  // Use env var if set
  const envGid = process.env.ASANA_WORKSPACE_GID
  if (envGid) return envGid

  // Use cache if available
  if (cachedWorkspaceGid) return cachedWorkspaceGid

  // Auto-discover from API
  const data = await asanaFetch('/workspaces')
  const workspaces = data.data as Array<{ gid: string; name: string }>
  const target = workspaces.find(
    (ws) => ws.name.toLowerCase() === ALLOWED_WORKSPACE_NAME.toLowerCase()
  )
  if (!target) {
    throw new Error(
      `Workspace "${ALLOWED_WORKSPACE_NAME}" not found. Available: ${workspaces.map((w) => w.name).join(', ')}`
    )
  }

  cachedWorkspaceGid = target.gid
  return target.gid
}

// 営業案件プロジェクトのタスク一覧取得（フォーム検索用）
export async function getSalesProjectTasks(): Promise<AsanaTask[]> {
  const projectGid = process.env.ASANA_SALES_PROJECT_GID
  if (!projectGid) throw new Error('ASANA_SALES_PROJECT_GID is not set')
  const data = await asanaFetch(`/projects/${projectGid}/tasks?opt_fields=name,gid&limit=100`)
  return data.data as AsanaTask[]
}

// 開発ボードのタスク一覧取得（開発計画との照合用）
export async function getDevProjectTasks(): Promise<AsanaDevTask[]> {
  const projectGid = process.env.ASANA_DEV_PROJECT_GID
  if (!projectGid) throw new Error('ASANA_DEV_PROJECT_GID is not set')

  const data = await asanaFetch(
    `/projects/${projectGid}/tasks?opt_fields=name,gid,notes,completed,assignee.name,due_on,memberships.section.name&limit=100`
  )

  return (data.data as Array<{
    gid: string
    name: string
    notes: string | null
    completed: boolean
    assignee: { name: string } | null
    due_on: string | null
    memberships: Array<{ section: { name: string } }>
  }>).map(task => ({
    gid: task.gid,
    name: task.name,
    notes: task.notes || '',
    completed: task.completed,
    assignee: task.assignee?.name || null,
    dueOn: task.due_on || null,
    section: task.memberships?.[0]?.section?.name || null,
  }))
}

// サブタスク作成
export async function createSubtask(parentTaskGid: string, params: CreateSubtaskParams): Promise<AsanaTask> {
  const data = await asanaFetch(`/tasks/${parentTaskGid}/subtasks`, {
    method: 'POST',
    body: JSON.stringify({ data: params }),
  })
  return data.data as AsanaTask
}

// ワークスペースメンバー一覧（担当者選択用）
export async function getWorkspaceMembers(): Promise<AsanaUser[]> {
  const workspaceGid = await getWorkspaceGid()
  const data = await asanaFetch(`/workspaces/${workspaceGid}/users?opt_fields=name,gid,email`)
  return data.data as AsanaUser[]
}

// 案件管理プロジェクトのセクション付きタスク一覧取得
export async function getSalesProjectTasksWithSections(): Promise<AsanaDevTask[]> {
  const projectGid = process.env.ASANA_SALES_PROJECT_GID
  if (!projectGid) throw new Error('ASANA_SALES_PROJECT_GID is not set')

  const data = await asanaFetch(
    `/projects/${projectGid}/tasks?opt_fields=name,gid,notes,completed,assignee.name,due_on,memberships.section.name&limit=100`
  )

  return (data.data as Array<{
    gid: string
    name: string
    notes: string | null
    completed: boolean
    assignee: { name: string } | null
    due_on: string | null
    memberships: Array<{ section: { name: string } }>
  }>).map(task => ({
    gid: task.gid,
    name: task.name,
    notes: task.notes || '',
    completed: task.completed,
    assignee: task.assignee?.name || null,
    dueOn: task.due_on || null,
    section: task.memberships?.[0]?.section?.name || null,
  }))
}
