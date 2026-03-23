import type { AsanaTask, AsanaUser, CreateSubtaskParams } from '@/types/asana'

const ASANA_BASE_URL = 'https://app.asana.com/api/1.0'

async function asanaFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${ASANA_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${process.env.ASANA_ACCESS_TOKEN}`,
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

export async function getSalesProjectTasks(): Promise<AsanaTask[]> {
  const projectGid = process.env.ASANA_SALES_PROJECT_GID
  if (!projectGid) throw new Error('ASANA_SALES_PROJECT_GID is not set')
  const data = await asanaFetch(`/projects/${projectGid}/tasks?opt_fields=name,gid&limit=100`)
  return data.data as AsanaTask[]
}

export async function createSubtask(parentTaskGid: string, params: CreateSubtaskParams): Promise<AsanaTask> {
  const data = await asanaFetch(`/tasks/${parentTaskGid}/subtasks`, {
    method: 'POST',
    body: JSON.stringify({ data: params }),
  })
  return data.data as AsanaTask
}

export async function getWorkspaceMembers(): Promise<AsanaUser[]> {
  const workspaceGid = process.env.ASANA_WORKSPACE_GID
  if (!workspaceGid) throw new Error('ASANA_WORKSPACE_GID is not set')
  const data = await asanaFetch(`/workspaces/${workspaceGid}/users?opt_fields=name,gid,email`)
  return data.data as AsanaUser[]
}
