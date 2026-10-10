import { apiFetch, extractApiError, unwrapData } from './apiClient'

async function parseResponse(path, options, fallbackError) {
  const { response, payload } = await apiFetch(path, options)
  if (!response.ok) {
    throw new Error(extractApiError(payload, fallbackError))
  }
  return unwrapData(payload)
}

export async function fetchVisitRequests({ page = 1, pageSize = 10, status = '', search = '' } = {}) {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (status) params.set('status', status)
  if (search.trim()) params.set('search', search.trim())
  return parseResponse(`/api/v1/portfolio/visit-requests/?${params.toString()}`, { method: 'GET' }, 'Failed to fetch visit requests.')
}

export async function updateVisitRequest(id, payload) {
  return parseResponse(`/api/v1/portfolio/visit-requests/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  }, 'Failed to update visit request.')
}

export async function fetchVisitRequestEvents(id) {
  return parseResponse(`/api/v1/portfolio/visit-requests/${id}/events/`, { method: 'GET' }, 'Failed to fetch visit request history.')
}
