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

export interface CreateSubtaskParams {
  name: string
  assignee?: string
  due_on?: string
  notes?: string
}
