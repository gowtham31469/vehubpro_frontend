import { apiFetch, apiFetchBlob, extractApiError, unwrapData } from './apiClient'

async function parseResponse(path, options, fallbackError) {
  const { response, payload } = await apiFetch(path, options)
  if (!response.ok) {
    throw new Error(extractApiError(payload, fallbackError))
  }
  return unwrapData(payload)
}

export async function fetchInvoices({
  page = 1, pageSize = 10, paymentStatus = '', invoiceType = '', isCancelled, fyCode = '', search = '',
  dateFrom = '', dateTo = '', includeCustomerName = false,
} = {}) {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (paymentStatus) params.set('payment_status', paymentStatus)
  if (invoiceType) params.set('invoice_type', invoiceType)
  if (isCancelled !== undefined) params.set('is_cancelled', String(isCancelled))
  if (fyCode) params.set('fy_code', fyCode)
  if (search.trim()) params.set('search', search.trim())
  if (dateFrom) params.set('date_from', dateFrom)
  if (dateTo) params.set('date_to', dateTo)
  if (includeCustomerName) params.set('include_customer_name', 'true')
  return parseResponse(`/api/v1/invoices/?${params.toString()}`, { method: 'GET' }, 'Failed to fetch invoices.')
}

/** Report query params shared by the summary and export endpoints — dateFrom/dateTo are required by the backend. */
function reportParams({ dateFrom, dateTo, paymentStatus = '', invoiceType = '' }) {
  const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo })
  if (paymentStatus) params.set('payment_status', paymentStatus)
  if (invoiceType) params.set('invoice_type', invoiceType)
  return params
}

/** DB-side aggregate KPIs for the invoice report — fast regardless of row count. */
export async function fetchInvoiceReportSummary(filters) {
  const params = reportParams(filters)
  return parseResponse(`/api/v1/invoices/reports/summary/?${params.toString()}`, { method: 'GET' }, 'Failed to load report summary.')
}

/**
 * Downloads the invoice report as a CSV file — streamed from the backend so
 * it stays fast/light even across a very large date range, then saved via a
 * normal browser download rather than held as a big array of JS objects.
 */
export async function downloadInvoiceReportCsv(filters) {
  const params = reportParams(filters)
  const blob = await apiFetchBlob(`/api/v1/invoices/reports/export/?${params.toString()}`, { method: 'GET' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `invoice_report_${filters.dateFrom}_to_${filters.dateTo}.csv`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function getInvoice(id) {
  return parseResponse(`/api/v1/invoices/${id}/`, { method: 'GET' }, 'Failed to load invoice.')
}

/**
 * Raw HTML (same template used to generate the PDF) for embedding in an iframe preview.
 * termsNewPage/bankNewPage mirror the same layout toggles accepted by generateInvoicePdf,
 * so the preview reflects the layout the user is about to download.
 */
export async function fetchInvoicePreviewHtml(id, { termsNewPage = false, bankNewPage = false } = {}) {
  const params = new URLSearchParams()
  if (termsNewPage) params.set('terms_new_page', 'true')
  if (bankNewPage) params.set('bank_new_page', 'true')
  const qs = params.toString()
  const { response, text } = await apiFetch(`/api/v1/invoices/${id}/preview-html/${qs ? `?${qs}` : ''}`, { method: 'GET' })
  if (!response.ok) {
    throw new Error('Failed to load invoice preview.')
  }
  return text
}

export async function recordPayment(id, payload) {
  return parseResponse(
    `/api/v1/invoices/${id}/record-payment/`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to record payment.',
  )
}

export async function cancelInvoice(id, payload = {}) {
  return parseResponse(
    `/api/v1/invoices/${id}/cancel/`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to cancel invoice.',
  )
}

export async function generateInvoiceFromJobCard(jobCardId, payload = {}) {
  return parseResponse(
    `/api/v1/job-cards/${jobCardId}/generate-invoice/`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to generate invoice.',
  )
}

/**
 * termsNewPage/bankNewPage are download-time layout overrides — start "Terms &
 * Conditions" / "Our account details" on a fresh page instead of flowing
 * naturally. Either one always generates a fresh, one-off PDF (never the
 * cached default), so it never affects what a plain "Download PDF" returns.
 */
export async function generateInvoicePdf(invoiceId, { force = false, termsNewPage = false, bankNewPage = false } = {}) {
  const params = new URLSearchParams()
  if (force) params.set('force', 'true')
  if (termsNewPage) params.set('terms_new_page', 'true')
  if (bankNewPage) params.set('bank_new_page', 'true')
  const qs = params.toString()
  const url = `/api/v1/invoices/${invoiceId}/generate-pdf/${qs ? `?${qs}` : ''}`
  return parseResponse(url, { method: 'POST' }, 'Failed to generate PDF.')
}
