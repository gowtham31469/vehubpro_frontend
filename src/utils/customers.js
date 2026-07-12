import { apiFetch, extractApiError, unwrapData } from './apiClient'

async function parseResponse(path, options, fallbackError) {
  const { response, payload } = await apiFetch(path, options)
  if (!response.ok) {
    throw new Error(extractApiError(payload, fallbackError))
  }
  return unwrapData(payload)
}

export async function fetchCustomers({ page = 1, pageSize = 10, isArchived = false } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    is_archive: String(Boolean(isArchived)),
  })
  return parseResponse(`/api/v1/customers/?${params.toString()}`, { method: 'GET' }, 'Failed to fetch customers.')
}

export async function createCustomer(payload) {
  const isFormData = payload instanceof FormData;
  const options = {
    method: 'POST',
    body: isFormData ? payload : JSON.stringify(payload),
    ...(isFormData ? {} : { headers: { 'Content-Type': 'application/json' } }),
  };
  return parseResponse('/api/v1/customers/', options, 'Failed to create customer.');
}

export async function updateCustomer(customerId, payload) {
  const isFormData = payload instanceof FormData;
  const options = {
    method: 'PUT',
    body: isFormData ? payload : JSON.stringify(payload),
    ...(isFormData ? {} : { headers: { 'Content-Type': 'application/json' } }),
  };
  return parseResponse(`/api/v1/customers/${customerId}/`, options, 'Failed to update customer.');
}

export async function deleteCustomer(customerId) {
  return parseResponse(`/api/v1/customers/${customerId}/`, { method: 'DELETE' }, 'Failed to delete customer.')
}

export async function fetchStates() {
  return parseResponse('/api/v1/masters/states/', { method: 'GET' }, 'Failed to fetch states.')
}

export async function fetchCities(stateId) {
  const params = new URLSearchParams()
  if (stateId) params.set('state_id', stateId)
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return parseResponse(`/api/v1/masters/cities/${suffix}`, { method: 'GET' }, 'Failed to fetch cities.')
}
