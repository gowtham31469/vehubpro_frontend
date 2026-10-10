import { apiFetch, extractApiError, unwrapData } from './apiClient'

async function parseResponse(path, options, fallbackError) {
  const { response, payload } = await apiFetch(path, options)
  if (!response.ok) throw new Error(extractApiError(payload, fallbackError))
  return unwrapData(payload)
}

export async function getDelivery(saleId) {
  return parseResponse(`/api/v1/dealer-sales/sales/${saleId}/delivery/`, { method: 'GET' }, 'Failed to load delivery details.')
}

export async function saveDelivery(saleId, payload) {
  return parseResponse(
    `/api/v1/dealer-sales/sales/${saleId}/delivery/`,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to record delivery.',
  )
}
