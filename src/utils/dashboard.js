import { apiFetch, extractApiError, unwrapData } from './apiClient'

async function parseResponse(path, fallbackError) {
  const { response, payload } = await apiFetch(path, { method: 'GET' })
  if (!response.ok) throw new Error(extractApiError(payload, fallbackError))
  return unwrapData(payload)
}

export async function fetchDashboardSummary() {
  return parseResponse('/api/v1/dashboard/summary/', 'Failed to fetch dashboard summary.')
}

export async function fetchRevenueTrend(months = 6) {
  return parseResponse(
    `/api/v1/dashboard/revenue-trend/?months=${months}`,
    'Failed to fetch revenue trend.',
  )
}

export async function fetchJobCardFunnel() {
  return parseResponse('/api/v1/dashboard/jobcard-funnel/', 'Failed to fetch job card funnel.')
}

export async function fetchRecentActivity(limit = 10) {
  return parseResponse(
    `/api/v1/dashboard/recent-activity/?limit=${limit}`,
    'Failed to fetch recent activity.',
  )
}

export async function fetchPaymentDistribution() {
  return parseResponse('/api/v1/dashboard/payment-distribution/', 'Failed to fetch payment distribution.')
}

export async function fetchTopServices(limit = 6, months = 3) {
  return parseResponse(
    `/api/v1/dashboard/top-services/?limit=${limit}&months=${months}`,
    'Failed to fetch top services.',
  )
}
