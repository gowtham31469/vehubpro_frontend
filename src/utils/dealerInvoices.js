import { apiFetch, extractApiError, unwrapData } from './apiClient'

async function parseResponse(path, options, fallbackError) {
  const { response, payload } = await apiFetch(path, options)
  if (!response.ok) throw new Error(extractApiError(payload, fallbackError))
  return unwrapData(payload)
}

function jsonBody(payload) {
  return { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload || {}) }
}

export async function getSaleInvoice(saleId) {
  return parseResponse(`/api/v1/dealer-sales/sales/${saleId}/invoice/`, { method: 'GET' }, 'Failed to load invoice.')
}

export async function createSaleInvoice(saleId, payload) {
  return parseResponse(
    `/api/v1/dealer-sales/sales/${saleId}/invoice/`,
    { method: 'POST', ...jsonBody(payload) },
    'Failed to generate invoice.',
  )
}

export async function recordInvoicePayment(invoiceId, payload) {
  return parseResponse(
    `/api/v1/dealer-sales/invoices/${invoiceId}/record-payment/`,
    { method: 'POST', ...jsonBody(payload) },
    'Failed to record payment.',
  )
}

export async function fetchSaleInvoicePreviewHtml(invoiceId) {
  const { response, text } = await apiFetch(`/api/v1/dealer-sales/invoices/${invoiceId}/preview-html/`, { method: 'GET' })
  if (!response.ok) throw new Error('Failed to load invoice preview.')
  return text
}

export async function generateSaleInvoicePdf(invoiceId, { force = false } = {}) {
  const qs = force ? '?force=true' : ''
  return parseResponse(
    `/api/v1/dealer-sales/invoices/${invoiceId}/generate-pdf/${qs}`,
    { method: 'POST' },
    'Failed to generate PDF.',
  )
}
