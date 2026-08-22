export function loadList<T>(key: string): T[] | null {
  if (!import.meta.client) return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : null
  } catch {
    return null
  }
}

export function saveList<T>(key: string, list: T[]) {
  if (import.meta.client) localStorage.setItem(key, JSON.stringify(list))
}

export function genId(): string {
  return crypto.randomUUID()
}
