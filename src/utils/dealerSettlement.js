import { apiFetch, extractApiError, unwrapData } from './apiClient'

async function parseResponse(path, options, fallbackError) {
  const { response, payload } = await apiFetch(path, options)
  if (!response.ok) throw new Error(extractApiError(payload, fallbackError))
  return unwrapData(payload)
}

function jsonBody(payload) {
  return { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload || {}) }
}

export async function getSettlement(saleId) {
  return parseResponse(`/api/v1/dealer-sales/sales/${saleId}/settlement/`, { method: 'GET' }, 'Failed to load settlement details.')
}

export async function createSettlement(saleId, payload) {
  return parseResponse(
    `/api/v1/dealer-sales/sales/${saleId}/settlement/`,
    { method: 'PUT', ...jsonBody(payload) },
    'Failed to create settlement.',
  )
}

export async function markSettlementPaid(saleId, payload) {
  return parseResponse(
    `/api/v1/dealer-sales/sales/${saleId}/settlement/mark-paid/`,
    { method: 'POST', ...jsonBody(payload) },
    'Failed to mark settlement as paid.',
  )
}
