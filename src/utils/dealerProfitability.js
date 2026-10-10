import { apiFetch, extractApiError, unwrapData } from './apiClient'

async function parseResponse(path, options, fallbackError) {
  const { response, payload } = await apiFetch(path, options)
  if (!response.ok) throw new Error(extractApiError(payload, fallbackError))
  return unwrapData(payload)
}

export async function fetchVehicleProfitability(vehicleId) {
  return parseResponse(`/api/v1/dealer-sales/vehicles/${vehicleId}/profitability/`, { method: 'GET' }, 'Failed to compute profitability.')
}
