import { apiFetch, extractApiError, unwrapData } from './apiClient'

async function parseResponse(path, options, fallbackError) {
  const { response, payload } = await apiFetch(path, options)
  if (!response.ok) throw new Error(extractApiError(payload, fallbackError))
  return unwrapData(payload)
}

function toFormData(payload) {
  const formData = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return
    formData.append(key, value)
  })
  return formData
}

export async function fetchVehicleDocuments(vehicleId) {
  return parseResponse(`/api/v1/dealer-sales/vehicles/${vehicleId}/documents/`, { method: 'GET' }, 'Failed to fetch documents.')
}

export async function uploadVehicleDocument(vehicleId, payload) {
  return parseResponse(
    `/api/v1/dealer-sales/vehicles/${vehicleId}/documents/`,
    { method: 'POST', body: toFormData(payload) },
    'Failed to upload document.',
  )
}

export async function deleteVehicleDocument(vehicleId, documentId) {
  return parseResponse(`/api/v1/dealer-sales/vehicles/${vehicleId}/documents/${documentId}/`, { method: 'DELETE' }, 'Failed to delete document.')
}
