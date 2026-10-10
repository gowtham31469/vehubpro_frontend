// Customer (portal) auth — deliberately separate storage keys from
// utils/apiClient.js's staff session (access_token/refresh_token/current_user)
// so a customer and a logged-in staff member can coexist in the same browser
// without clobbering each other's session.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

function extractError(payload, fallback) {
  if (!payload) return fallback
  const err = payload.error
  if (typeof err === 'string') return err
  if (err && typeof err === 'object') {
    const first = Object.values(err)[0]
    if (Array.isArray(first) && first.length) return String(first[0])
    if (typeof first === 'string') return first
  }
  if (typeof payload.message === 'string') return payload.message
  return fallback
}

async function post(path, body) {
  if (!API_BASE_URL) throw new Error('Missing VITE_API_BASE_URL')
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  let payload = null
  try { payload = await response.json() } catch { payload = null }
  if (!response.ok) {
    throw new Error(extractError(payload, 'Something went wrong. Please try again.'))
  }
  return payload?.data ?? {}
}

function storeSession({ access, refresh, user }) {
  if (access) localStorage.setItem('customer_access_token', access)
  if (refresh) localStorage.setItem('customer_refresh_token', refresh)
  if (user) localStorage.setItem('customer_user', JSON.stringify(user))
}

function getAccessToken() {
  return localStorage.getItem('customer_access_token')
}

function getRefreshToken() {
  return localStorage.getItem('customer_refresh_token')
}

let refreshPromise = null

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const refresh = getRefreshToken()
    if (!refresh) throw new Error('SESSION_EXPIRED')

    const response = await fetch(`${API_BASE_URL}/api/v1/public/portal/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
    let payload = null
    try { payload = await response.json() } catch { payload = null }
    const data = payload?.data || payload || {}
    if (!response.ok || !data?.access) throw new Error('SESSION_EXPIRED')

    localStorage.setItem('customer_access_token', data.access)
    if (data.refresh) localStorage.setItem('customer_refresh_token', data.refresh)
    return data.access
  })()

  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

/** Authenticated fetch for /api/v1/portal/* endpoints — retries once on an expired access token. */
async function portalFetch(path, options = {}) {
  if (!API_BASE_URL) throw new Error('Missing VITE_API_BASE_URL')

  const doFetch = (token) => fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  })

  let response = await doFetch(getAccessToken())
  if (response.status === 401) {
    try {
      const newAccess = await refreshAccessToken()
      response = await doFetch(newAccess)
    } catch {
      logoutCustomer()
      if (typeof window !== 'undefined') window.location.href = '/portfolio/login'
      throw new Error('SESSION_EXPIRED')
    }
  }

  let payload = null
  try { payload = await response.json() } catch { payload = null }
  if (!response.ok) {
    throw new Error(extractError(payload, 'Something went wrong. Please try again.'))
  }
  return payload?.data ?? {}
}

export async function signupCustomer(subdomain, { full_name, email, phone, password }) {
  const data = await post(`/api/v1/public/portal/tenants/${subdomain}/signup/`, { full_name, email, phone, password })
  storeSession(data)
  return data.user
}

export async function loginCustomer(subdomain, { email, password }) {
  const data = await post(`/api/v1/public/portal/tenants/${subdomain}/login/`, { email, password })
  storeSession(data)
  return data.user
}

export function isCustomerAuthenticated() {
  return Boolean(localStorage.getItem('customer_access_token'))
}

export function getCustomerUser() {
  const raw = localStorage.getItem('customer_user')
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function logoutCustomer() {
  localStorage.removeItem('customer_access_token')
  localStorage.removeItem('customer_refresh_token')
  localStorage.removeItem('customer_user')
}

export async function getProfile() {
  return portalFetch('/api/v1/portal/me/profile/')
}

export async function updateProfile(fullName) {
  const data = await portalFetch('/api/v1/portal/me/profile/', {
    method: 'PATCH',
    body: JSON.stringify({ full_name: fullName }),
  })
  // Keep the header's cached user in sync so the avatar/name update immediately.
  const current = getCustomerUser()
  if (current) {
    localStorage.setItem('customer_user', JSON.stringify({ ...current, full_name: data.full_name }))
  }
  return data
}

export async function changePassword({ currentPassword, newPassword }) {
  return portalFetch('/api/v1/portal/me/change-password/', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })
}

export async function fetchWishlist() {
  return portalFetch('/api/v1/portal/me/wishlist/')
}

export async function addToWishlist(vehicleId) {
  return portalFetch(`/api/v1/portal/me/wishlist/${vehicleId}/`, { method: 'POST' })
}

export async function removeFromWishlist(vehicleId) {
  return portalFetch(`/api/v1/portal/me/wishlist/${vehicleId}/`, { method: 'DELETE' })
}

export async function fetchMyVisitRequests() {
  return portalFetch('/api/v1/portal/me/visit-requests/')
}

export async function bookVisit(vehicleId, { preferredDate, preferredTime, message } = {}) {
  return portalFetch(`/api/v1/portal/me/vehicles/${vehicleId}/book-visit/`, {
    method: 'POST',
    body: JSON.stringify({
      preferred_date: preferredDate || null,
      preferred_time: preferredTime || null,
      message: message || '',
    }),
  })
}
