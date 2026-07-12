const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

let refreshPromise = null

function getAccessToken() {
  return localStorage.getItem('access_token')
}

function getRefreshToken() {
  return localStorage.getItem('refresh_token')
}

function setTokens({ access, refresh }) {
  if (access) localStorage.setItem('access_token', access)
  if (refresh) localStorage.setItem('refresh_token', refresh)
}

export function clearSession() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('current_user')
}

export function getCurrentUser() {
  const raw = localStorage.getItem('current_user')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setCurrentUser(user) {
  if (user) {
    localStorage.setItem('current_user', JSON.stringify(user))
  } else {
    localStorage.removeItem('current_user')
  }
}

function parseJsonSafe(text) {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function isExpiredAccessTokenPayload(payload) {
  const code = payload?.error?.code
  if (code !== 'token_not_valid') return false
  const messages = payload?.error?.messages
  if (!Array.isArray(messages)) return true
  return messages.some((m) => String(m?.message || '').toLowerCase().includes('expired'))
}

export function extractApiError(payload, fallback) {
  if (!payload) return fallback
  if (typeof payload === 'string') return payload

  const err = payload.error
  if (typeof err === 'string') return err
  if (Array.isArray(err) && err.length) return String(err[0])
  if (err && typeof err === 'object') {
    if (Array.isArray(err.non_field_errors) && err.non_field_errors.length) {
      return String(err.non_field_errors[0])
    }
    const first = Object.values(err)[0]
    if (Array.isArray(first) && first.length) return String(first[0])
    if (typeof first === 'string') return first
  }

  if (typeof payload.message === 'string') return payload.message
  return fallback
}

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const refresh = getRefreshToken()
    if (!refresh) throw new Error('SESSION_EXPIRED')

    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })

    const text = await response.text()
    const payload = parseJsonSafe(text)

    if (!response.ok) {
      throw new Error('SESSION_EXPIRED')
    }

    const data = payload?.data || payload || {}
    if (!data?.access) {
      throw new Error('SESSION_EXPIRED')
    }

    setTokens({ access: data.access, refresh: data.refresh })
    return data.access
  })()

  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

export async function apiFetch(path, options = {}, { retryOnAuthError = true } = {}) {
  if (!API_BASE_URL) {
    throw new Error('Missing VITE_API_BASE_URL in frontend .env file.')
  }

  const headers = { ...(options.headers || {}) }
  const access = getAccessToken()
  if (access) headers.Authorization = `Bearer ${access}`

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  const text = await response.text()
  const payload = parseJsonSafe(text)

  if (
    response.status === 401 &&
    retryOnAuthError &&
    isExpiredAccessTokenPayload(payload)
  ) {
    try {
      const newAccess = await refreshAccessToken()
      const retryHeaders = { ...(options.headers || {}), Authorization: `Bearer ${newAccess}` }
      const retryResponse = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: retryHeaders })
      const retryText = await retryResponse.text()
      const retryPayload = parseJsonSafe(retryText)
      return { response: retryResponse, payload: retryPayload }
    } catch {
      clearSession()
      throw new Error('SESSION_EXPIRED')
    }
  }

  return { response, payload }
}

export function unwrapData(payload) {
  return payload?.data ?? payload
}
