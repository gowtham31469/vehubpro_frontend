import { apiFetch, extractApiError, unwrapData } from './apiClient'

async function parseResponse(path, options, fallbackError) {
  const { response, payload } = await apiFetch(path, options)
  if (!response.ok) {
    throw new Error(extractApiError(payload, fallbackError))
  }
  return unwrapData(payload)
}

export async function fetchLeads({ page = 1, pageSize = 10, status = '', assignedTo = '', due = '', search = '' } = {}) {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (status) params.set('status', status)
  if (assignedTo) params.set('assigned_to', assignedTo)
  if (due) params.set('due', due)
  if (search.trim()) params.set('search', search.trim())
  return parseResponse(`/api/v1/leads/leads/?${params.toString()}`, { method: 'GET' }, 'Failed to fetch leads.')
}

export async function createLead(payload) {
  return parseResponse('/api/v1/leads/leads/', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  }, 'Failed to create lead.')
}

export async function updateLead(id, payload) {
  return parseResponse(`/api/v1/leads/leads/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  }, 'Failed to update lead.')
}

export async function fetchLeadEvents(id) {
  return parseResponse(`/api/v1/leads/leads/${id}/events/`, { method: 'GET' }, 'Failed to fetch lead history.')
}

export async function convertLead(id, payload) {
  return parseResponse(`/api/v1/leads/leads/${id}/convert/`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  }, 'Failed to convert lead.')
}

export async function convertLeadToInventory(id, payload) {
  return parseResponse(`/api/v1/leads/leads/${id}/convert-to-inventory/`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  }, 'Failed to convert lead to an inventory vehicle.')
}
