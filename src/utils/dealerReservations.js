import { apiFetch, extractApiError, unwrapData } from './apiClient'

async function parseResponse(path, options, fallbackError) {
  const { response, payload } = await apiFetch(path, options)
  if (!response.ok) throw new Error(extractApiError(payload, fallbackError))
  return unwrapData(payload)
}

function jsonBody(payload) {
  return { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload || {}) }
}

export async function fetchReservations(vehicleId, { page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  return parseResponse(`/api/v1/dealer-sales/vehicles/${vehicleId}/reservations/?${params.toString()}`, { method: 'GET' }, 'Failed to fetch reservations.')
}

export async function createReservation(vehicleId, payload) {
  return parseResponse(
    `/api/v1/dealer-sales/vehicles/${vehicleId}/reservations/`,
    { method: 'POST', ...jsonBody(payload) },
    'Failed to create reservation.',
  )
}

export async function cancelReservation(reservationId, payload) {
  return parseResponse(
    `/api/v1/dealer-sales/reservations/${reservationId}/cancel/`,
    { method: 'POST', ...jsonBody(payload) },
    'Failed to cancel reservation.',
  )
}
