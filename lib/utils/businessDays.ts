let holidayCache: Set<string> | null = null
let cacheDate: string | null = null

async function getJapaneseHolidays(): Promise<Set<string>> {
  const today = new Date().toISOString().split('T')[0]
  if (holidayCache && cacheDate === today) {
    return holidayCache
  }
  const res = await fetch('https://holidays-jp.github.io/api/v1/date.json')
  const data: Record<string, string> = await res.json()
  holidayCache = new Set(Object.keys(data))
  cacheDate = today
  return holidayCache
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export async function getNextBusinessDay(
  startDate: Date,
  daysToAdd: number
): Promise<string> {
  const holidays = await getJapaneseHolidays()
  let count = 0
  const current = new Date(startDate)
  while (count < daysToAdd) {
    current.setDate(current.getDate() + 1)
    const dateStr = formatDate(current)
    const dayOfWeek = current.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const isHoliday = holidays.has(dateStr)
    if (!isWeekend && !isHoliday) count++
  }
  return formatDate(current)
}
