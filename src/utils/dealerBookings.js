import { apiFetch, extractApiError, unwrapData } from './apiClient'

async function parseResponse(path, options, fallbackError) {
  const { response, payload } = await apiFetch(path, options)
  if (!response.ok) throw new Error(extractApiError(payload, fallbackError))
  return unwrapData(payload)
}

function jsonBody(payload) {
  return { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload || {}) }
}

export async function fetchBookings(vehicleId, { page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  return parseResponse(`/api/v1/dealer-sales/vehicles/${vehicleId}/bookings/?${params.toString()}`, { method: 'GET' }, 'Failed to fetch bookings.')
}

export async function createBooking(vehicleId, payload) {
  return parseResponse(
    `/api/v1/dealer-sales/vehicles/${vehicleId}/bookings/`,
    { method: 'POST', ...jsonBody(payload) },
    'Failed to create booking.',
  )
}

export async function cancelBooking(bookingId, payload) {
  return parseResponse(
    `/api/v1/dealer-sales/bookings/${bookingId}/cancel/`,
    { method: 'POST', ...jsonBody(payload) },
    'Failed to cancel booking.',
  )
}
