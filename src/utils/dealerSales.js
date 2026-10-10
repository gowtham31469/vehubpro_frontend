import { apiFetch, extractApiError, unwrapData } from './apiClient'

async function parseResponse(path, options, fallbackError) {
  const { response, payload } = await apiFetch(path, options)
  if (!response.ok) throw new Error(extractApiError(payload, fallbackError))
  return unwrapData(payload)
}

function jsonBody(payload) {
  return { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload || {}) }
}

export async function fetchSales(vehicleId, { page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  return parseResponse(`/api/v1/dealer-sales/vehicles/${vehicleId}/sales/?${params.toString()}`, { method: 'GET' }, 'Failed to fetch sales.')
}

export async function createSale(vehicleId, payload) {
  return parseResponse(
    `/api/v1/dealer-sales/vehicles/${vehicleId}/sales/`,
    { method: 'POST', ...jsonBody(payload) },
    'Failed to confirm sale.',
  )
}

export async function cancelSale(saleId, payload) {
  return parseResponse(
    `/api/v1/dealer-sales/sales/${saleId}/cancel/`,
    { method: 'POST', ...jsonBody(payload) },
    'Failed to cancel sale.',
  )
}
