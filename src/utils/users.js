import { apiFetch, extractApiError, unwrapData } from './apiClient'

async function parseResponse(path, options, fallbackError) {
  const { response, payload } = await apiFetch(path, options)
  if (!response.ok) {
    throw new Error(extractApiError(payload, fallbackError))
  }
  return unwrapData(payload)
}

export async function fetchStaffUsers({ page = 1, pageSize = 10, search = '' } = {}) {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (search.trim()) params.set('search', search.trim())
  return parseResponse(`/api/v1/users/staff/?${params.toString()}`, { method: 'GET' }, 'Failed to fetch users.')
}

export async function createStaffUser(payload) {
  return parseResponse(
    '/api/v1/users/staff/',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to create user.',
  )
}

export async function updateStaffUser(userId, payload) {
  return parseResponse(
    `/api/v1/users/staff/${userId}/`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to update user.',
  )
}

export async function deleteStaffUser(userId) {
  return parseResponse(`/api/v1/users/staff/${userId}/`, { method: 'DELETE' }, 'Failed to delete user.')
}

export async function fetchRoles() {
  return parseResponse('/api/v1/masters/roles/', { method: 'GET' }, 'Failed to fetch roles.')
}

export async function fetchTenantPermissionCatalog() {
  return parseResponse('/api/v1/modules/my-tenant-permissions/', { method: 'GET' }, 'Failed to fetch permissions.')
}
