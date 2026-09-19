import { apiFetch, extractApiError, unwrapData } from './apiClient'

async function parseResponse(path, options, fallbackError) {
  const { response, payload } = await apiFetch(path, options)
  if (!response.ok) {
    throw new Error(extractApiError(payload, fallbackError))
  }
  return unwrapData(payload)
}

export async function fetchInventoryVehicles({ page = 1, pageSize = 10, isArchived = false, status = '', search = '' } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    is_archive: String(Boolean(isArchived)),
  })
  if (status) params.set('status', status)
  if (search.trim()) params.set('search', search.trim())
  return parseResponse(`/api/v1/portfolio/inventory-vehicles/?${params.toString()}`, { method: 'GET' }, 'Failed to fetch inventory vehicles.')
}

export async function getInventoryVehicle(id) {
  return parseResponse(`/api/v1/portfolio/inventory-vehicles/${id}/`, { method: 'GET' }, 'Failed to load inventory vehicle.')
}

function toFormData(payload) {
  const formData = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value === null || value === undefined) return
    if (key === 'photo_files' && Array.isArray(value)) {
      value.forEach((file) => formData.append('photo_files', file))
      return
    }
    if (key === 'remove_photos' && Array.isArray(value)) {
      value.forEach((k) => formData.append('remove_photos', k))
      return
    }
    if (key === 'key_features' && Array.isArray(value)) {
      value.forEach((f) => formData.append('key_features', f))
      return
    }
    if (key === 'reasons_to_buy') {
      // A JSONField can't come through multipart form-data as repeated keys
      // the way a list of IDs can — send it as one JSON-encoded string field;
      // DRF's JSONField parses a string value automatically.
      formData.append('reasons_to_buy', JSON.stringify(value || []))
      return
    }
    formData.append(key, value)
  })
  return formData
}

export async function createInventoryVehicle(payload) {
  return parseResponse(
    '/api/v1/portfolio/inventory-vehicles/',
    { method: 'POST', body: toFormData(payload) },
    'Failed to create inventory vehicle.',
  )
}

export async function updateInventoryVehicle(id, payload) {
  return parseResponse(
    `/api/v1/portfolio/inventory-vehicles/${id}/`,
    { method: 'PATCH', body: toFormData(payload) },
    'Failed to update inventory vehicle.',
  )
}

export async function deleteInventoryVehicle(id) {
  return parseResponse(`/api/v1/portfolio/inventory-vehicles/${id}/`, { method: 'DELETE' }, 'Failed to archive inventory vehicle.')
}

/** Tenant-scoped key-feature master (managed under Configuration). */
export async function fetchInventoryFeatures({ page = 1, pageSize = 100, isArchived = false, isActive, search = '' } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    is_archive: String(Boolean(isArchived)),
  })
  if (isActive !== undefined) params.set('is_active', String(Boolean(isActive)))
  if (search.trim()) params.set('search', search.trim())
  return parseResponse(`/api/v1/portfolio/inventory-features/?${params.toString()}`, { method: 'GET' }, 'Failed to fetch key features.')
}

export async function createInventoryFeature(payload) {
  return parseResponse(
    '/api/v1/portfolio/inventory-features/',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to create key feature.',
  )
}

export async function updateInventoryFeature(id, payload) {
  return parseResponse(
    `/api/v1/portfolio/inventory-features/${id}/`,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to update key feature.',
  )
}

export async function deleteInventoryFeature(id) {
  return parseResponse(`/api/v1/portfolio/inventory-features/${id}/`, { method: 'DELETE' }, 'Failed to delete key feature.')
}

export async function fetchPortfolioDashboardSummary() {
  return parseResponse('/api/v1/portfolio/dashboard-summary/', { method: 'GET' }, 'Failed to fetch portfolio dashboard summary.')
}
