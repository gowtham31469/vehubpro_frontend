import { apiFetch, extractApiError, unwrapData } from './apiClient'

async function parseResponse(path, options, fallbackError) {
  const { response, payload } = await apiFetch(path, options)
  if (!response.ok) {
    throw new Error(extractApiError(payload, fallbackError))
  }
  return unwrapData(payload)
}

export async function fetchCreditNotes({
  page = 1, pageSize = 10, status = '', refundStatus = '', invoiceId = '', search = '',
  dateFrom = '', dateTo = '',
} = {}) {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (status) params.set('status', status)
  if (refundStatus) params.set('refund_status', refundStatus)
  if (invoiceId) params.set('invoice_id', invoiceId)
  if (search.trim()) params.set('search', search.trim())
  if (dateFrom) params.set('date_from', dateFrom)
  if (dateTo) params.set('date_to', dateTo)
  return parseResponse(`/api/v1/credit-notes/?${params.toString()}`, { method: 'GET' }, 'Failed to fetch credit notes.')
}

export async function getCreditNote(id) {
  return parseResponse(`/api/v1/credit-notes/${id}/`, { method: 'GET' }, 'Failed to load credit note.')
}

export async function generateCreditNote(invoiceId, payload) {
  return parseResponse(
    `/api/v1/invoices/${invoiceId}/credit-notes/`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to issue credit note.',
  )
}

export async function fetchCreditNotePreviewHtml(id) {
  const { response, text } = await apiFetch(`/api/v1/credit-notes/${id}/preview-html/`, { method: 'GET' })
  if (!response.ok) {
    throw new Error('Failed to load credit note preview.')
  }
  return text
}

export async function generateCreditNotePdf(id, { force = false } = {}) {
  const params = new URLSearchParams()
  if (force) params.set('force', 'true')
  const qs = params.toString()
  return parseResponse(`/api/v1/credit-notes/${id}/generate-pdf/${qs ? `?${qs}` : ''}`, { method: 'POST' }, 'Failed to generate PDF.')
}

export async function markCreditNoteRefunded(id, payload = {}) {
  return parseResponse(
    `/api/v1/credit-notes/${id}/mark-refunded/`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to mark credit note as refunded.',
  )
}

export async function cancelCreditNote(id, payload = {}) {
  return parseResponse(
    `/api/v1/credit-notes/${id}/cancel/`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to cancel credit note.',
  )
}

// ── Reason Categories (tenant-curated master, managed in Configuration) ──────

export async function fetchReasonCategories({ archived = false, isActive, search = '' } = {}) {
  const params = new URLSearchParams({ page_size: 'all', is_archive: String(archived) })
  if (isActive !== undefined) params.set('is_active', String(isActive))
  if (search.trim()) params.set('search', search.trim())
  const data = await parseResponse(
    `/api/v1/credit-notes/reason-categories/?${params.toString()}`, { method: 'GET' }, 'Failed to fetch reason categories.',
  )
  return data.results || []
}

export async function createReasonCategory(payload) {
  return parseResponse(
    '/api/v1/credit-notes/reason-categories/',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to create reason category.',
  )
}

export async function updateReasonCategory(id, payload) {
  return parseResponse(
    `/api/v1/credit-notes/reason-categories/${id}/`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to update reason category.',
  )
}

export async function archiveReasonCategory(id) {
  return parseResponse(
    `/api/v1/credit-notes/reason-categories/${id}/`,
    { method: 'DELETE' },
    'Failed to archive reason category.',
  )
}
