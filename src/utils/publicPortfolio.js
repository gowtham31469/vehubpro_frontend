const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export async function fetchPublicInventoryVehicles(subdomain, { limit } = {}) {
  if (!API_BASE_URL) throw new Error('Missing VITE_API_BASE_URL')
  if (!subdomain) throw new Error('No tenant subdomain detected.')

  const params = new URLSearchParams()
  if (limit) params.set('limit', String(limit))
  const qs = params.toString() ? `?${params.toString()}` : ''

  const response = await fetch(`${API_BASE_URL}/api/v1/public/portfolio/tenants/${subdomain}/inventory/${qs}`)
  let payload = null
  try { payload = await response.json() } catch { payload = null }
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || 'Could not load inventory.')
  }
  return payload?.data ?? []
}

/** Single-vehicle detail for the "View Details" page — 404s if sold/booked/archived. */
export async function fetchPublicInventoryVehicleDetail(subdomain, id) {
  if (!API_BASE_URL) throw new Error('Missing VITE_API_BASE_URL')
  if (!subdomain) throw new Error('No tenant subdomain detected.')

  const response = await fetch(`${API_BASE_URL}/api/v1/public/portfolio/tenants/${subdomain}/inventory/${id}/`)
  let payload = null
  try { payload = await response.json() } catch { payload = null }
  if (!response.ok) {
    const err = new Error(payload?.error || payload?.message || 'Could not load this vehicle.')
    err.status = response.status
    throw err
  }
  return payload?.data ?? null
}

/** Every active brand the tenant has created — not just ones with current inventory. */
export async function fetchPublicVehicleBrands(subdomain) {
  if (!API_BASE_URL) throw new Error('Missing VITE_API_BASE_URL')
  if (!subdomain) throw new Error('No tenant subdomain detected.')

  const response = await fetch(`${API_BASE_URL}/api/v1/public/portfolio/tenants/${subdomain}/brands/`)
  let payload = null
  try { payload = await response.json() } catch { payload = null }
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || 'Could not load brands.')
  }
  return payload?.data ?? []
}
