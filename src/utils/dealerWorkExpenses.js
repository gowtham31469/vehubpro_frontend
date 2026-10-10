import { apiFetch, extractApiError, unwrapData } from './apiClient'

async function parseResponse(path, options, fallbackError) {
  const { response, payload } = await apiFetch(path, options)
  if (!response.ok) throw new Error(extractApiError(payload, fallbackError))
  return unwrapData(payload)
}

function toFormData(payload) {
  const formData = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return
    formData.append(key, value)
  })
  return formData
}

export async function fetchWorkExpenses(vehicleId, { page = 1, pageSize = 10, status = '', category = '', search = '' } = {}) {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (status) params.set('status', status)
  if (category) params.set('category', category)
  if (search.trim()) params.set('search', search.trim())
  return parseResponse(`/api/v1/dealer-sales/vehicles/${vehicleId}/work-expenses/?${params.toString()}`, { method: 'GET' }, 'Failed to fetch work expenses.')
}

export async function createWorkExpense(vehicleId, payload) {
  const hasFile = payload.receipt_file instanceof File
  return parseResponse(
    `/api/v1/dealer-sales/vehicles/${vehicleId}/work-expenses/`,
    hasFile
      ? { method: 'POST', body: toFormData(payload) }
      : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to create work expense.',
  )
}

export async function updateWorkExpense(vehicleId, expenseId, payload) {
  const hasFile = payload.receipt_file instanceof File
  return parseResponse(
    `/api/v1/dealer-sales/vehicles/${vehicleId}/work-expenses/${expenseId}/`,
    hasFile
      ? { method: 'PATCH', body: toFormData(payload) }
      : { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to update work expense.',
  )
}

export async function deleteWorkExpense(vehicleId, expenseId) {
  return parseResponse(`/api/v1/dealer-sales/vehicles/${vehicleId}/work-expenses/${expenseId}/`, { method: 'DELETE' }, 'Failed to archive work expense.')
}
