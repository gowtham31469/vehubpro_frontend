import { apiFetch, extractApiError, unwrapData } from './apiClient'

async function parseResponse(path, options, fallbackError) {
  const { response, payload } = await apiFetch(path, options)
  if (!response.ok) throw new Error(extractApiError(payload, fallbackError))
  return unwrapData(payload)
}

export async function getVehicleAcquisition(vehicleId) {
  return parseResponse(`/api/v1/dealer-sales/vehicles/${vehicleId}/acquisition/`, { method: 'GET' }, 'Failed to load acquisition details.')
}

export async function saveVehicleAcquisition(vehicleId, payload) {
  return parseResponse(
    `/api/v1/dealer-sales/vehicles/${vehicleId}/acquisition/`,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to save acquisition details.',
  )
}
