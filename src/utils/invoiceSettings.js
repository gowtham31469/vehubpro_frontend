import { apiFetch, extractApiError, unwrapData } from './apiClient'

async function parseResponse(path, options, fallbackError) {
  const { response, payload } = await apiFetch(path, options)
  if (!response.ok) {
    throw new Error(extractApiError(payload, fallbackError))
  }
  return unwrapData(payload)
}

/** Self-service invoice settings (bank details, UPI QR, terms & conditions) for the
 * authenticated tenant — scoped by JWT, no tenant id needed. */
export async function fetchMyInvoiceSettings() {
  return parseResponse('/api/v1/tenants/invoice-settings/me/', { method: 'GET' }, 'Failed to fetch invoice settings.')
}

export async function updateMyInvoiceSettings(payload) {
  const isFormData = payload instanceof FormData
  const options = {
    method: 'PATCH',
    body: isFormData ? payload : JSON.stringify(payload),
    ...(isFormData ? {} : { headers: { 'Content-Type': 'application/json' } }),
  }
  return parseResponse('/api/v1/tenants/invoice-settings/me/', options, 'Failed to update invoice settings.')
}
