import { apiFetch, extractApiError, unwrapData } from './apiClient'

async function parseResponse(path, options, fallbackError) {
  const { response, payload } = await apiFetch(path, options)
  if (!response.ok) {
    throw new Error(extractApiError(payload, fallbackError))
  }
  return unwrapData(payload)
}

export async function fetchInvoices({ page = 1, pageSize = 10, paymentStatus = '', fyCode = '', search = '' } = {}) {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (paymentStatus) params.set('payment_status', paymentStatus)
  if (fyCode) params.set('fy_code', fyCode)
  if (search.trim()) params.set('search', search.trim())
  return parseResponse(`/api/v1/invoices/?${params.toString()}`, { method: 'GET' }, 'Failed to fetch invoices.')
}

export async function getInvoice(id) {
  return parseResponse(`/api/v1/invoices/${id}/`, { method: 'GET' }, 'Failed to load invoice.')
}

export async function recordPayment(id, payload) {
  return parseResponse(
    `/api/v1/invoices/${id}/record-payment/`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to record payment.',
  )
}

export async function generateInvoiceFromJobCard(jobCardId, payload = {}) {
  return parseResponse(
    `/api/v1/job-cards/${jobCardId}/generate-invoice/`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to generate invoice.',
  )
}

export async function generateInvoicePdf(invoiceId, { force = false } = {}) {
  const url = `/api/v1/invoices/${invoiceId}/generate-pdf/${force ? '?force=true' : ''}`
  return parseResponse(url, { method: 'POST' }, 'Failed to generate PDF.')
}
