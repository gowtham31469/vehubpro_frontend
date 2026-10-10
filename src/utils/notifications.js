import { apiFetch, extractApiError, unwrapData } from './apiClient'

async function parseResponse(path, options, fallbackError) {
  const { response, payload } = await apiFetch(path, options)
  if (!response.ok) {
    throw new Error(extractApiError(payload, fallbackError))
  }
  return unwrapData(payload)
}

export async function fetchNotifications({ page = 1, pageSize = 10, unreadOnly = false } = {}) {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (unreadOnly) params.set('unread', 'true')
  return parseResponse(`/api/v1/notifications/?${params.toString()}`, { method: 'GET' }, 'Failed to fetch notifications.')
}

export async function fetchUnreadNotificationCount() {
  return parseResponse('/api/v1/notifications/unread-count/', { method: 'GET' }, 'Failed to fetch unread count.')
}

export async function markNotificationRead(id) {
  return parseResponse(`/api/v1/notifications/${id}/read/`, { method: 'POST' }, 'Failed to mark notification as read.')
}

export async function markAllNotificationsRead() {
  return parseResponse('/api/v1/notifications/mark-all-read/', { method: 'POST' }, 'Failed to mark notifications as read.')
}
