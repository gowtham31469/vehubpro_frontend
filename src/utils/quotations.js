import { apiFetch, extractApiError, unwrapData } from './apiClient'

async function parseResponse(path, options, fallbackError) {
  const { response, payload } = await apiFetch(path, options)
  if (!response.ok) {
    throw new Error(extractApiError(payload, fallbackError))
  }
  return unwrapData(payload)
}

export async function fetchQuotations({ page = 1, pageSize = 10, status = '', search = '' } = {}) {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (status) params.set('status', status)
  if (search.trim()) params.set('search', search.trim())
  return parseResponse(`/api/v1/quotations/?${params.toString()}`, { method: 'GET' }, 'Failed to fetch quotations.')
}

export async function getQuotation(id) {
  return parseResponse(`/api/v1/quotations/${id}/`, { method: 'GET' }, 'Failed to load quotation.')
}

export async function getQuotationRevisions(id) {
  return parseResponse(`/api/v1/quotations/${id}/revisions/`, { method: 'GET' }, 'Failed to load revision history.')
}

export async function createQuotation(payload) {
  return parseResponse(
    '/api/v1/quotations/',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to create quotation.',
  )
}

export async function patchQuotation(id, payload) {
  return parseResponse(
    `/api/v1/quotations/${id}/`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to update quotation.',
  )
}

export async function deleteQuotation(id) {
  return parseResponse(`/api/v1/quotations/${id}/`, { method: 'DELETE' }, 'Failed to delete quotation.')
}

export async function sendQuotation(id) {
  return parseResponse(`/api/v1/quotations/${id}/send/`, { method: 'PATCH' }, 'Failed to send quotation.')
}

export async function approveQuotation(id) {
  return parseResponse(`/api/v1/quotations/${id}/approve/`, { method: 'PATCH' }, 'Failed to approve quotation.')
}

export async function rejectQuotation(id, payload = {}) {
  return parseResponse(
    `/api/v1/quotations/${id}/reject/`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to reject quotation.',
  )
}

export async function cancelQuotation(id, payload = {}) {
  return parseResponse(
    `/api/v1/quotations/${id}/cancel/`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to cancel quotation.',
  )
}

export async function reviseQuotation(id, payload) {
  return parseResponse(
    `/api/v1/quotations/${id}/revise/`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to create revision.',
  )
}

export async function convertQuotationToJobCard(id) {
  return parseResponse(
    `/api/v1/quotations/${id}/convert-to-job-card/`,
    { method: 'POST' },
    'Failed to convert quotation to a job card.',
  )
}

/** Raw HTML (same template used to generate the PDF) for embedding in an iframe preview. */
export async function fetchQuotationPreviewHtml(id) {
  const { response, text } = await apiFetch(`/api/v1/quotations/${id}/preview-html/`, { method: 'GET' })
  if (!response.ok) {
    throw new Error('Failed to load quotation preview.')
  }
  return text
}

export async function generateQuotationPdf(id, { force = false } = {}) {
  const url = `/api/v1/quotations/${id}/generate-pdf/${force ? '?force=true' : ''}`
  return parseResponse(url, { method: 'POST' }, 'Failed to generate PDF.')
}
