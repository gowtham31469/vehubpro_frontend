import { apiFetch, unwrapData } from './apiClient'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const BRANDING_STORAGE_KEY = 'tenant_branding'

export const DEFAULT_BRANDING = {
  primary_color: '#1e378a',
  logo_url: '',
  business_name: '',
}

export function getSubdomain() {
  const hostname = window.location.hostname // e.g. "chezhiyancars.localhost"
  const parts = hostname.split('.')
  if (parts.length > 1 && parts[0] !== 'www' && parts[0] !== 'localhost') {
    return parts[0]
  }
  return null
}

export function getStoredBranding() {
  try {
    const raw = localStorage.getItem(BRANDING_STORAGE_KEY)
    if (!raw) return DEFAULT_BRANDING
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_BRANDING,
      ...parsed,
    }
  } catch {
    return DEFAULT_BRANDING
  }
}

export function saveBranding(branding) {
  const normalized = {
    ...DEFAULT_BRANDING,
    ...(branding || {}),
  }
  localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(normalized))
  return normalized
}

export async function fetchBrandingByToken() {
  const { response, payload } = await apiFetch('/api/v1/tenants/branding/me/', { method: 'GET' })
  if (!response.ok) {
    throw new Error('Could not fetch tenant branding.')
  }
  const data = unwrapData(payload) || {}
  return saveBranding(data)
}

export async function fetchPublicTenantBranding(subdomain) {
  if (!API_BASE_URL) throw new Error('Missing VITE_API_BASE_URL')
  const response = await fetch(`${API_BASE_URL}/api/v1/public/tenants/${subdomain}/branding/`)
  if (!response.ok) throw new Error('Could not fetch public tenant branding')
  let payload = null
  try { payload = await response.json() } catch { payload = null }
  const data = (payload?.data ?? payload) || {}
  return saveBranding(data)
}
