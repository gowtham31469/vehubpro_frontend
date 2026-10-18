import { apiFetch, apiFetchBlob, extractApiError, unwrapData } from './apiClient'

async function parseResponse(path, options, fallbackError) {
  const { response, payload } = await apiFetch(path, options)
  if (!response.ok) throw new Error(extractApiError(payload, fallbackError))
  return unwrapData(payload)
}

/** Shared by the list/summary/export endpoints — dateFrom/dateTo required by summary and export. */
function reportParams({ dateFrom, dateTo, inventoryType = '', status = '' }) {
  const params = new URLSearchParams()
  if (dateFrom) params.set('date_from', dateFrom)
  if (dateTo) params.set('date_to', dateTo)
  if (inventoryType) params.set('inventory_type', inventoryType)
  if (status) params.set('status', status)
  return params
}

export async function fetchVehicleSalesReportRows({ page = 1, pageSize = 50, ...filters } = {}) {
  const params = reportParams(filters)
  params.set('page', String(page))
  params.set('page_size', String(pageSize))
  return parseResponse(`/api/v1/dealer-sales/reports/sales/?${params.toString()}`, { method: 'GET' }, 'Failed to load report page.')
}

export async function fetchVehicleSalesReportSummary(filters) {
  const params = reportParams(filters)
  return parseResponse(`/api/v1/dealer-sales/reports/sales/summary/?${params.toString()}`, { method: 'GET' }, 'Failed to load report summary.')
}

/**
 * Downloads the Vehicle Sales Report as a CSV file — streamed from the
 * backend so it stays light even across a large date range, then saved via
 * a normal browser download rather than held as a big array of JS objects.
 */
export async function downloadVehicleSalesReportCsv(filters) {
  const params = reportParams(filters)
  const blob = await apiFetchBlob(`/api/v1/dealer-sales/reports/sales/export/?${params.toString()}`, { method: 'GET' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `vehicle_sales_report_${filters.dateFrom}_to_${filters.dateTo}.csv`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
