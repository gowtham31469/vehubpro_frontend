import { apiFetch, extractApiError, unwrapData } from './apiClient'

async function parseResponse(path, options, fallbackError) {
  const { response, payload } = await apiFetch(path, options)
  if (!response.ok) throw new Error(extractApiError(payload, fallbackError))
  return unwrapData(payload)
}

export async function fetchOwnershipHistory(vehicleId) {
  return parseResponse(`/api/v1/dealer-sales/vehicles/${vehicleId}/ownership-history/`, { method: 'GET' }, 'Failed to fetch ownership history.')
}

export async function addOwnershipRecord(vehicleId, payload) {
  return parseResponse(
    `/api/v1/dealer-sales/vehicles/${vehicleId}/ownership-history/`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to add ownership record.',
  )
}
