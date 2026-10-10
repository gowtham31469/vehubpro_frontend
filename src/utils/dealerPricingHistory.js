import { apiFetch, extractApiError, unwrapData } from './apiClient'

async function parseResponse(path, options, fallbackError) {
  const { response, payload } = await apiFetch(path, options)
  if (!response.ok) throw new Error(extractApiError(payload, fallbackError))
  return unwrapData(payload)
}

export async function fetchPricingHistory(vehicleId, { page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  return parseResponse(`/api/v1/dealer-sales/vehicles/${vehicleId}/pricing-history/?${params.toString()}`, { method: 'GET' }, 'Failed to fetch pricing history.')
}
