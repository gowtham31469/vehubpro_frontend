import { apiFetch, extractApiError, unwrapData } from './apiClient'

async function parseResponse(path, options, fallbackError) {
  const { response, payload } = await apiFetch(path, options)
  if (!response.ok) {
    throw new Error(extractApiError(payload, fallbackError))
  }
  return unwrapData(payload)
}

/** Service Categories */
export async function fetchServiceCategories({ page = 1, pageSize = 10, isArchived = false, isActive } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    is_archive: String(Boolean(isArchived)),
  })
  if (isActive !== undefined) params.set('is_active', String(Boolean(isActive)))
  return parseResponse(`/api/v1/services/categories/?${params.toString()}`, { method: 'GET' }, 'Failed to fetch service categories.')
}

export async function createServiceCategory(payload) {
  return parseResponse(
    '/api/v1/services/categories/',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to create service category.',
  )
}

export async function updateServiceCategory(id, payload) {
  return parseResponse(
    `/api/v1/services/categories/${id}/`,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to update service category.',
  )
}

export async function patchServiceCategory(id, payload) {
  return parseResponse(
    `/api/v1/services/categories/${id}/`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to update service category.',
  )
}

export async function deleteServiceCategory(id) {
  return parseResponse(`/api/v1/services/categories/${id}/`, { method: 'DELETE' }, 'Failed to delete service category.')
}

/** Service Items */
export async function fetchServiceItems({ page = 1, pageSize = 10, categoryId, isArchived = false, isActive } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    is_archive: String(Boolean(isArchived)),
  })
  if (categoryId) params.set('category_id', categoryId)
  if (isActive !== undefined) params.set('is_active', String(Boolean(isActive)))
  return parseResponse(`/api/v1/services/items/?${params.toString()}`, { method: 'GET' }, 'Failed to fetch service items.')
}

export async function createServiceItem(payload) {
  return parseResponse(
    '/api/v1/services/items/',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to create service item.',
  )
}

export async function updateServiceItem(id, payload) {
  return parseResponse(
    `/api/v1/services/items/${id}/`,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to update service item.',
  )
}

export async function patchServiceItem(id, payload) {
  return parseResponse(
    `/api/v1/services/items/${id}/`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to update service item.',
  )
}

export async function deleteServiceItem(id) {
  return parseResponse(`/api/v1/services/items/${id}/`, { method: 'DELETE' }, 'Failed to delete service item.')
}

export async function uploadServiceItemImage(id, file) {
  const formData = new FormData()
  formData.append('image', file)
  return parseResponse(
    `/api/v1/services/items/${id}/image/`,
    { method: 'PUT', body: formData },
    'Failed to upload service item image.',
  )
}

export async function deleteServiceItemImage(id) {
  return parseResponse(
    `/api/v1/services/items/${id}/image/`,
    { method: 'DELETE' },
    'Failed to remove service item image.',
  )
}
