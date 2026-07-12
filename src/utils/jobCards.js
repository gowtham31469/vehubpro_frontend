import { apiFetch, extractApiError, unwrapData } from './apiClient'

async function parseResponse(path, options, fallbackError) {
  const { response, payload } = await apiFetch(path, options)
  if (!response.ok) {
    throw new Error(extractApiError(payload, fallbackError))
  }
  return unwrapData(payload)
}

export async function fetchJobCards({ page = 1, pageSize = 10, tab = 'all', search = '' } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    tab: tab || 'all',
  })
  if (search.trim()) params.set('search', search.trim())
  return parseResponse(`/api/v1/job-cards/?${params.toString()}`, { method: 'GET' }, 'Failed to fetch job cards.')
}

export async function fetchJobCardStats() {
  return parseResponse('/api/v1/job-cards/stats/', { method: 'GET' }, 'Failed to fetch job card stats.')
}

export async function getJobCard(id) {
  return parseResponse(`/api/v1/job-cards/${id}/`, { method: 'GET' }, 'Failed to load job card.')
}

export async function createJobCard(payload) {
  return parseResponse(
    '/api/v1/job-cards/',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to create job card.',
  )
}

export async function updateJobCard(id, payload) {
  return parseResponse(
    `/api/v1/job-cards/${id}/`,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to update job card.',
  )
}

export async function patchJobCard(id, payload) {
  return parseResponse(
    `/api/v1/job-cards/${id}/`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to update job card.',
  )
}

export async function deleteJobCard(id) {
  return parseResponse(`/api/v1/job-cards/${id}/`, { method: 'DELETE' }, 'Failed to delete job card.')
}

export async function generateJobCardPdf(id) {
  return parseResponse(
    `/api/v1/job-cards/${id}/generate-pdf/`,
    { method: 'POST' },
    'Failed to generate job card PDF.'
  )
}
