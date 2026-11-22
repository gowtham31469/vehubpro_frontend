import { apiFetch, extractApiError, unwrapData } from './apiClient'

async function parseResponse(path, options, fallbackError) {
  const { response, payload } = await apiFetch(path, options)
  if (!response.ok) {
    throw new Error(extractApiError(payload, fallbackError))
  }
  return unwrapData(payload)
}

// ── Vendors ───────────────────────────────────────────────────────────────────

export async function fetchVendors({ page = 1, pageSize = 10, search = '', category = '', archived = '' } = {}) {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (search.trim()) params.set('search', search.trim())
  if (category) params.set('category', category)
  if (archived !== '') params.set('archived', String(archived))
  return parseResponse(`/api/v1/vendors/?${params.toString()}`, { method: 'GET' }, 'Failed to fetch vendors.')
}

export async function getVendor(id) {
  return parseResponse(`/api/v1/vendors/${id}/`, { method: 'GET' }, 'Failed to load vendor.')
}

export async function createVendor(payload) {
  return parseResponse(
    '/api/v1/vendors/',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to create vendor.',
  )
}

export async function updateVendor(id, payload) {
  return parseResponse(
    `/api/v1/vendors/${id}/`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to update vendor.',
  )
}

export async function archiveVendor(id) {
  return parseResponse(
    `/api/v1/vendors/${id}/`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archive_action: 'archive' }) },
    'Failed to archive vendor.',
  )
}

export async function reactivateVendor(id) {
  return parseResponse(
    `/api/v1/vendors/${id}/`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archive_action: 'reactivate' }) },
    'Failed to reactivate vendor.',
  )
}

// ── Vendor Categories (tenant-curated master, managed in Configuration) ──────

export async function fetchVendorCategories({ archived = false, isActive, search = '' } = {}) {
  const params = new URLSearchParams({ page_size: 'all', is_archive: String(archived) })
  if (isActive !== undefined) params.set('is_active', String(isActive))
  if (search.trim()) params.set('search', search.trim())
  const data = await parseResponse(
    `/api/v1/vendors/categories/?${params.toString()}`, { method: 'GET' }, 'Failed to fetch vendor categories.',
  )
  return data.results || []
}

export async function createVendorCategory(payload) {
  return parseResponse(
    '/api/v1/vendors/categories/',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to create vendor category.',
  )
}

export async function updateVendorCategory(id, payload) {
  return parseResponse(
    `/api/v1/vendors/categories/${id}/`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to update vendor category.',
  )
}

export async function archiveVendorCategory(id) {
  return parseResponse(
    `/api/v1/vendors/categories/${id}/`,
    { method: 'DELETE' },
    'Failed to archive vendor category.',
  )
}

// ── Vendor Bills ──────────────────────────────────────────────────────────────

export async function fetchVendorBills({
  page = 1, pageSize = 10, vendorId = '', status = '', paymentStatus = '', search = '',
  dateFrom = '', dateTo = '',
} = {}) {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (vendorId) params.set('vendor_id', vendorId)
  if (status) params.set('status', status)
  if (paymentStatus) params.set('payment_status', paymentStatus)
  if (search.trim()) params.set('search', search.trim())
  if (dateFrom) params.set('date_from', dateFrom)
  if (dateTo) params.set('date_to', dateTo)
  return parseResponse(`/api/v1/vendors/bills/?${params.toString()}`, { method: 'GET' }, 'Failed to fetch vendor bills.')
}

export async function getVendorBill(id) {
  return parseResponse(`/api/v1/vendors/bills/${id}/`, { method: 'GET' }, 'Failed to load vendor bill.')
}

export async function createVendorBill(payload) {
  const formData = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return
    formData.append(key, value)
  })
  return parseResponse(
    '/api/v1/vendors/bills/',
    { method: 'POST', body: formData },
    'Failed to create vendor bill.',
  )
}

export async function cancelVendorBill(id, payload = {}) {
  return parseResponse(
    `/api/v1/vendors/bills/${id}/cancel/`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to cancel vendor bill.',
  )
}

// ── Vendor Payments ───────────────────────────────────────────────────────────

export async function fetchVendorPayments({
  page = 1, pageSize = 10, vendorId = '', vendorBillId = '', paymentMode = '', dateFrom = '', dateTo = '',
} = {}) {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (vendorId) params.set('vendor_id', vendorId)
  if (vendorBillId) params.set('vendor_bill_id', vendorBillId)
  if (paymentMode) params.set('payment_mode', paymentMode)
  if (dateFrom) params.set('date_from', dateFrom)
  if (dateTo) params.set('date_to', dateTo)
  return parseResponse(`/api/v1/vendors/payments/?${params.toString()}`, { method: 'GET' }, 'Failed to fetch vendor payments.')
}

export async function createVendorPayment(payload) {
  return parseResponse(
    '/api/v1/vendors/payments/',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to record vendor payment.',
  )
}

export async function voidVendorPayment(id, payload = {}) {
  return parseResponse(
    `/api/v1/vendors/payments/${id}/void/`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to void vendor payment.',
  )
}

// ── Insights ──────────────────────────────────────────────────────────────────

export async function fetchVendorInsights({ months = 6, limit = 8 } = {}) {
  const params = new URLSearchParams({ months: String(months), limit: String(limit) })
  return parseResponse(`/api/v1/vendors/insights/?${params.toString()}`, { method: 'GET' }, 'Failed to fetch vendor insights.')
}
