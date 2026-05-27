const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

export class ApiError extends Error {
  readonly status: number
  readonly name: string

  constructor(status: number, name: string, message: string) {
    super(message)
    this.status = status
    this.name = name
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })

  if (!res.ok) {
    let name = 'ApiError'
    let message = res.statusText
    try {
      const body = await res.json()
      name = body?.error?.name ?? name
      message = body?.error?.message ?? message
    } catch {
      // non-JSON error body — keep defaults
    }
    throw new ApiError(res.status, name, message)
  }

  // 204 No Content
  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
}
