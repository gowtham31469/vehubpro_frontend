import { apiFetch, extractApiError, unwrapData } from './apiClient'

async function parseResponse(path, options, fallbackError) {
  const { response, payload } = await apiFetch(path, options)
  if (!response.ok) throw new Error(extractApiError(payload, fallbackError))
  return unwrapData(payload)
}

function jsonBody(payload) {
  return { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload || {}) }
}

// ── Generation from a job card ──────────────────────────────────────────────

export async function generateProformaInvoiceFromJobCard(jobCardId, payload = {}) {
  return parseResponse(
    `/api/v1/job-cards/${jobCardId}/generate-proforma-invoice/`,
    { method: 'POST', ...jsonBody(payload) },
    'Failed to generate proforma invoice.',
  )
}

// ── List / detail ────────────────────────────────────────────────────────────

export async function fetchProformaInvoices({ page = 1, pageSize = 10, status = '', search = '', jobCardId = '' } = {}) {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (status) params.set('status', status)
  if (search.trim()) params.set('search', search.trim())
  if (jobCardId) params.set('job_card', jobCardId)
  return parseResponse(`/api/v1/proforma-invoices/?${params.toString()}`, { method: 'GET' }, 'Failed to fetch proforma invoices.')
}

export async function getProformaInvoice(id) {
  return parseResponse(`/api/v1/proforma-invoices/${id}/`, { method: 'GET' }, 'Failed to load proforma invoice.')
}

export async function fetchProformaInvoiceRevisions(id) {
  return parseResponse(`/api/v1/proforma-invoices/${id}/revisions/`, { method: 'GET' }, 'Failed to load revision history.')
}

// ── Status transitions ───────────────────────────────────────────────────────

export async function issueProformaInvoice(id) {
  return parseResponse(`/api/v1/proforma-invoices/${id}/issue/`, { method: 'POST', ...jsonBody({}) }, 'Failed to issue proforma invoice.')
}

export async function approveProformaInvoice(id) {
  return parseResponse(`/api/v1/proforma-invoices/${id}/approve/`, { method: 'POST', ...jsonBody({}) }, 'Failed to approve proforma invoice.')
}

export async function rejectProformaInvoice(id, payload) {
  return parseResponse(`/api/v1/proforma-invoices/${id}/reject/`, { method: 'POST', ...jsonBody(payload) }, 'Failed to reject proforma invoice.')
}

export async function cancelProformaInvoice(id, payload) {
  return parseResponse(`/api/v1/proforma-invoices/${id}/cancel/`, { method: 'POST', ...jsonBody(payload) }, 'Failed to cancel proforma invoice.')
}

export async function reviseProformaInvoice(id, payload) {
  return parseResponse(`/api/v1/proforma-invoices/${id}/revise/`, { method: 'POST', ...jsonBody(payload) }, 'Failed to create revision.')
}

export async function convertProformaInvoiceToInvoice(id) {
  return parseResponse(`/api/v1/proforma-invoices/${id}/convert/`, { method: 'POST', ...jsonBody({}) }, 'Failed to convert to invoice.')
}

// ── PDF preview / download ───────────────────────────────────────────────────

export async function fetchProformaInvoicePreviewHtml(id) {
  const { response, text } = await apiFetch(`/api/v1/proforma-invoices/${id}/preview-html/`, { method: 'GET' })
  if (!response.ok) throw new Error('Failed to load proforma invoice preview.')
  return text
}

export async function generateProformaInvoicePdf(id, { force = false } = {}) {
  const qs = force ? '?force=true' : ''
  return parseResponse(`/api/v1/proforma-invoices/${id}/generate-pdf/${qs}`, { method: 'POST' }, 'Failed to generate PDF.')
}

// ── Advance payments ──────────────────────────────────────────────────────────

export async function fetchAdvancePayments(proformaId, { page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  return parseResponse(`/api/v1/proforma-invoices/${proformaId}/advance-payments/?${params.toString()}`, { method: 'GET' }, 'Failed to fetch advance payments.')
}

export async function recordAdvancePayment(proformaId, payload) {
  return parseResponse(`/api/v1/proforma-invoices/${proformaId}/advance-payments/`, { method: 'POST', ...jsonBody(payload) }, 'Failed to record advance payment.')
}

export async function markAdvancePaymentReceived(paymentId) {
  return parseResponse(`/api/v1/advance-payments/${paymentId}/mark-received/`, { method: 'POST', ...jsonBody({}) }, 'Failed to mark payment as received.')
}

export async function reverseAdvancePayment(paymentId, payload) {
  return parseResponse(`/api/v1/advance-payments/${paymentId}/reverse/`, { method: 'POST', ...jsonBody(payload) }, 'Failed to reverse advance payment.')
}

export async function refundAdvancePayment(paymentId, payload) {
  return parseResponse(`/api/v1/advance-payments/${paymentId}/refund/`, { method: 'POST', ...jsonBody(payload) }, 'Failed to refund advance payment.')
}

export async function generateAdvanceReceiptPdf(paymentId, { force = false } = {}) {
  const qs = force ? '?force=true' : ''
  return parseResponse(`/api/v1/advance-payments/${paymentId}/receipt/generate-pdf/${qs}`, { method: 'POST' }, 'Failed to generate receipt PDF.')
}
