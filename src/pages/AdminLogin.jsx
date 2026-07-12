import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveBranding } from '../utils/branding'
import { setCurrentUser } from '../utils/apiClient'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import loginSideImage from '../assets/images/logan-meis-7qLT-Msda1k-unsplash.jpg'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

function extractErrorMessage(payload) {
  if (!payload) return 'Login failed. Please try again.'
  if (typeof payload === 'string') return payload

  const error = payload.error
  if (typeof error === 'string') return error
  if (Array.isArray(error) && error.length > 0) return String(error[0])

  if (error && typeof error === 'object') {
    if (Array.isArray(error.non_field_errors) && error.non_field_errors.length > 0) {
      return String(error.non_field_errors[0])
    }

    const firstValue = Object.values(error)[0]
    if (Array.isArray(firstValue) && firstValue.length > 0) return String(firstValue[0])
    if (typeof firstValue === 'string') return firstValue
  }

  if (payload.message && typeof payload.message === 'string') return payload.message
  return 'Invalid credentials or unable to login.'
}

function validateForm(email, password) {
  const errors = {}
  const normalizedEmail = email.trim()

  if (!normalizedEmail) {
    errors.email = 'Email address is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    errors.email = 'Enter a valid email address.'
  }

  if (!password) {
    errors.password = 'Password is required.'
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters.'
  }

  return errors
}

export default function AdminLogin() {
  const { theme, branding, tenantName, tenantError, refresh: refreshBranding } = useTenantBranding()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    const errors = validateForm(email, password)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    if (!API_BASE_URL) {
      setErrorMessage('Missing VITE_API_BASE_URL in frontend .env file.')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      let payload = null
      try {
        payload = await response.json()
      } catch {
        payload = null
      }

      if (!response.ok) {
        setErrorMessage(extractErrorMessage(payload))
        return
      }

      const data = payload?.data || payload
      const accessToken = data?.access
      const refreshToken = data?.refresh

      if (!accessToken) {
        setErrorMessage('Login succeeded but access token is missing in API response.')
        return
      }

      localStorage.setItem('access_token', accessToken)
      if (refreshToken) localStorage.setItem('refresh_token', refreshToken)
      if (data?.user) setCurrentUser(data.user)

      try {
        await refreshBranding()
      } catch {
        saveBranding(null)
      }

      navigate('/admin/dashboard')
    } catch {
      setErrorMessage('Network error. Please check backend server and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Show elegant error page if tenant not found
  if (tenantError) {
    return (
      <div className="bg-white text-slate-900 font-display">
        <div className="flex h-screen overflow-hidden">
          <div className="flex h-full w-full flex-col items-center justify-center px-6 py-8">
            <div className="mx-auto w-full max-w-md text-center">
              <div className="mb-6">
                <div className="mb-4 text-6xl">🏢</div>
                <h1 className="text-3xl font-bold text-slate-900">Tenant Not Found</h1>
                <p className="mt-4 text-slate-500">
                  The organization you're trying to access isn't registered with us yet.
                </p>
              </div>

              <div className="space-y-4 rounded-lg bg-slate-50 p-6 text-left">
                <div>
                  <p className="text-sm font-semibold text-slate-700">What happened?</p>
                  <p className="mt-1 text-sm text-slate-600">
                    We couldn't find an active tenant for this domain. Please verify that:
                  </p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600">
                    <li>The domain is correct</li>
                    <li>Your organization is registered</li>
                    <li>Your subscription is active</li>
                  </ul>
                </div>
              </div>

              <div className="mt-8">
                <p className="text-sm text-slate-500">
                  Need help? Contact support at{' '}
                  <a href="mailto:support@vehubpro.com" className="font-medium text-blue-600 hover:text-blue-700">
                    support@vehubpro.com
                  </a>
                </p>
              </div>
            </div>
          </div>

          <div className="relative hidden w-0 flex-1 overflow-hidden lg:block">
            <img
              className="absolute inset-0 h-full w-full object-cover object-center"
              src={loginSideImage}
              alt="Service center"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white text-slate-900 font-display">
      <div className="flex h-screen overflow-hidden">
        <div className="flex h-full w-full flex-col justify-center overflow-y-auto px-6 py-8 lg:w-1/2 lg:px-24 xl:px-32">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-10">
              {branding?.logo_url && (
                <img
                  src={branding.logo_url}
                  alt={tenantName || 'Logo'}
                  className="mb-6 h-20 object-contain"
                />
              )}
              <h1 className="text-3xl font-bold">
                {tenantName ? `${tenantName}` : 'Staff Login'}
              </h1>
              <p className="mt-2 text-slate-500">
                {tenantName ? 'Sign in to access your staff portal.' : 'Enter your credentials to access the admin portal.'}
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit} noValidate>
              <div>
                <label className="block text-sm font-semibold text-slate-700" htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }))
                  }}
                  required
                  className={`mt-2 block w-full rounded-lg border-0 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 shadow-sm ring-1 ring-inset focus:ring-2 ${fieldErrors.email ? 'ring-rose-400 focus:ring-rose-500' : 'ring-slate-300 focus:ring-[var(--tenant-primary)]'}`}
                  placeholder="name@company.com"
                  autoComplete="email"
                />
                {fieldErrors.email ? (
                  <p className="mt-2 text-sm text-rose-600">{fieldErrors.email}</p>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700" htmlFor="password">Password</label>
                <div className="relative mt-2">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }))
                    }}
                    required
                    className={`block w-full rounded-lg border-0 px-4 py-3 pr-20 text-base text-slate-900 placeholder:text-slate-400 shadow-sm ring-1 ring-inset focus:ring-2 ${fieldErrors.password ? 'ring-rose-400 focus:ring-rose-500' : 'ring-slate-300 focus:ring-[var(--tenant-primary)]'}`}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 px-4 text-sm font-medium text-slate-500"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {fieldErrors.password ? (
                  <p className="mt-2 text-sm text-rose-600">{fieldErrors.password}</p>
                ) : null}
              </div>

              {errorMessage ? (
                <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {errorMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full justify-center rounded-lg px-3 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ backgroundColor: theme.accent }}
              >
                {isLoading ? 'Signing in...' : 'Sign in to Dashboard'}
              </button>
            </form>
          </div>
        </div>

        <div className="relative hidden w-0 flex-1 overflow-hidden lg:block">
          <img
            className="absolute inset-0 h-full w-full object-cover object-center"
            src={loginSideImage}
            alt="Service center"
          />
        </div>
      </div>
    </div>
  )
}
