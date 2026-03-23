import useSWR from 'swr'
import type { AsanaTask } from '@/types/asana'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useAsanaTasks() {
  const { data, error, isLoading } = useSWR<{ tasks: AsanaTask[] }>('/api/asana/tasks', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })
  return {
    tasks: data?.tasks || [],
    isLoading,
    error,
  }
}
