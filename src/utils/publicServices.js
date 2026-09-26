const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

/** Every active service category the tenant has created. */
export async function fetchPublicServiceCategories(subdomain) {
  if (!API_BASE_URL) throw new Error('Missing VITE_API_BASE_URL')
  if (!subdomain) throw new Error('No tenant subdomain detected.')

  const response = await fetch(`${API_BASE_URL}/api/v1/public/services/tenants/${subdomain}/categories/`)
  let payload = null
  try { payload = await response.json() } catch { payload = null }
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || 'Could not load service categories.')
  }
  return payload?.data ?? []
}

/** Every active service item — the homepage filters client-side for "Popular Services" (is_featured) and groups by category. */
export async function fetchPublicServiceItems(subdomain) {
  if (!API_BASE_URL) throw new Error('Missing VITE_API_BASE_URL')
  if (!subdomain) throw new Error('No tenant subdomain detected.')

  const response = await fetch(`${API_BASE_URL}/api/v1/public/services/tenants/${subdomain}/items/`)
  let payload = null
  try { payload = await response.json() } catch { payload = null }
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || 'Could not load services.')
  }
  return payload?.data ?? []
}
