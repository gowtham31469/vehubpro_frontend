import { apiFetch, extractApiError, unwrapData } from './apiClient'

async function parseResponse(path, options, fallbackError) {
  const { response, payload } = await apiFetch(path, options)
  if (!response.ok) {
    throw new Error(extractApiError(payload, fallbackError))
  }
  return unwrapData(payload)
}

/** Global masters (not tenant-scoped) */
export async function fetchVehicleTypes() {
  return parseResponse('/api/v1/vehicles/types/', { method: 'GET' }, 'Failed to fetch vehicle types.')
}

export async function fetchFuelTypes() {
  return parseResponse('/api/v1/vehicles/fuel-types/', { method: 'GET' }, 'Failed to fetch fuel types.')
}

/** Tenant-scoped brands */
export async function fetchBrands({ page = 1, pageSize = 10, isArchived = false, isActive } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    is_archive: String(Boolean(isArchived)),
  })
  if (isActive !== undefined) params.set('is_active', String(Boolean(isActive)))
  return parseResponse(`/api/v1/vehicles/brands/?${params.toString()}`, { method: 'GET' }, 'Failed to fetch brands.')
}

export async function createBrand(payload) {
  return parseResponse(
    '/api/v1/vehicles/brands/',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to create brand.',
  )
}

export async function updateBrand(brandId, payload) {
  return parseResponse(
    `/api/v1/vehicles/brands/${brandId}/`,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to update brand.',
  )
}

export async function patchBrand(brandId, payload) {
  return parseResponse(
    `/api/v1/vehicles/brands/${brandId}/`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to update brand.',
  )
}

export async function deleteBrand(brandId) {
  return parseResponse(`/api/v1/vehicles/brands/${brandId}/`, { method: 'DELETE' }, 'Failed to delete brand.')
}

/** Tenant-scoped models */
export async function fetchModels({ page = 1, pageSize = 10, brandId, isArchived = false, isActive } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    is_archive: String(Boolean(isArchived)),
  })
  if (brandId) params.set('brand_id', brandId)
  if (isActive !== undefined) params.set('is_active', String(Boolean(isActive)))
  return parseResponse(`/api/v1/vehicles/models/?${params.toString()}`, { method: 'GET' }, 'Failed to fetch models.')
}

export async function createModel(payload) {
  return parseResponse(
    '/api/v1/vehicles/models/',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to create model.',
  )
}

export async function updateModel(modelId, payload) {
  return parseResponse(
    `/api/v1/vehicles/models/${modelId}/`,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to update model.',
  )
}

export async function patchModel(modelId, payload) {
  return parseResponse(
    `/api/v1/vehicles/models/${modelId}/`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to update model.',
  )
}

export async function deleteModel(modelId) {
  return parseResponse(`/api/v1/vehicles/models/${modelId}/`, { method: 'DELETE' }, 'Failed to delete model.')
}

/** Service vehicles (tenant-scoped) — list at GET /api/v1/vehicles/ */
export async function fetchServiceVehicles({ page = 1, pageSize = 10, isArchived = false, customerId } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    is_archive: String(Boolean(isArchived)),
  })
  if (customerId) params.set('customer_id', customerId)
  return parseResponse(`/api/v1/vehicles/?${params.toString()}`, { method: 'GET' }, 'Failed to fetch service vehicles.')
}

export async function getServiceVehicle(id) {
  return parseResponse(`/api/v1/vehicles/${id}/`, { method: 'GET' }, 'Failed to load service vehicle.')
}

export async function createServiceVehicle(payload) {
  const isFormData = payload instanceof FormData;
  const options = {
    method: 'POST',
    body: isFormData ? payload : JSON.stringify(payload),
    ...(isFormData ? {} : { headers: { 'Content-Type': 'application/json' } }),
  };
  return parseResponse('/api/v1/vehicles/', options, 'Failed to create service vehicle.');
}

export async function updateServiceVehicle(id, payload) {
  const isFormData = payload instanceof FormData;
  const options = {
    method: 'PUT',
    body: isFormData ? payload : JSON.stringify(payload),
    ...(isFormData ? {} : { headers: { 'Content-Type': 'application/json' } }),
  };
  return parseResponse(`/api/v1/vehicles/${id}/`, options, 'Failed to update service vehicle.');
}

export async function patchServiceVehicle(id, payload) {
  const isFormData = payload instanceof FormData;
  const options = {
    method: 'PATCH',
    body: isFormData ? payload : JSON.stringify(payload),
    ...(isFormData ? {} : { headers: { 'Content-Type': 'application/json' } }),
  };
  return parseResponse(`/api/v1/vehicles/${id}/`, options, 'Failed to update service vehicle.');
}

export async function deleteServiceVehicle(id) {
  return parseResponse(`/api/v1/vehicles/${id}/`, { method: 'DELETE' }, 'Failed to delete service vehicle.')
}
