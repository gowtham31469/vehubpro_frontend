import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import PublicHeader from '../components/public/PublicHeader.jsx'
import PublicFooter from '../components/public/PublicFooter.jsx'
import { ACCENT, BTN_SHADOW } from '../components/public/theme.js'
import { loginCustomer } from '../utils/customerAuth'

const inputCls = 'mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-300'

export default function PublicCustomerLogin() {
  const { branding, brandingLogoUrl, tenantName, tenantError, subdomain } = useTenantBranding()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const hasPortfolio = branding?.has_portfolio_access === true
  const hasServices = branding?.has_services_access === true

  if (tenantError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4 text-center text-slate-900">
        <div>
          <h1 className="text-xl font-bold">Dealership not found</h1>
          <p className="mt-2 text-sm text-slate-500">Please check the URL and try again.</p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    if (!email.trim() || !password) {
      setErrorMessage('Please enter your email and password.')
      return
    }
    setIsLoading(true)
    try {
      await loginCustomer(subdomain, { email: email.trim(), password })
      navigate('/')
    } catch (err) {
      setErrorMessage(err.message || 'Invalid email or password.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F6F5FA] font-sans text-slate-900">
      <PublicHeader
        brandingLogoUrl={brandingLogoUrl}
        tenantName={tenantName}
        showInventory={hasPortfolio}
        showServices={hasServices}
        onHomeClick={() => navigate('/')}
      />

      <div className="flex flex-1 items-center justify-center px-4 py-14">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your {tenantName || 'account'}.</p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            {errorMessage ? (
              <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full justify-center rounded-xl px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: ACCENT, boxShadow: BTN_SHADOW }}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/portfolio/signup" className="font-semibold" style={{ color: ACCENT }}>Sign up</Link>
          </p>
        </div>
      </div>

      <PublicFooter
        brandingLogoUrl={brandingLogoUrl}
        tenantName={tenantName}
        branding={branding}
        showInventory={hasPortfolio}
        showServices={hasServices}
        onHomeClick={() => navigate('/')}
      />
    </div>
  )
}
