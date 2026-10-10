import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import PublicHeader from '../components/public/PublicHeader.jsx'
import PublicFooter from '../components/public/PublicFooter.jsx'
import { ACCENT, BTN_SHADOW } from '../components/public/theme.js'
import { signupCustomer } from '../utils/customerAuth'

const inputCls = 'mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-300'

function validate({ fullName, email, phone, password }) {
  const errors = {}
  if (!fullName.trim()) errors.fullName = 'Full name is required.'
  if (!email.trim()) errors.email = 'Email is required.'
  if (!phone.trim()) errors.phone = 'Phone number is required.'
  if (!password) errors.password = 'Password is required.'
  else if (password.length < 8) errors.password = 'Password must be at least 8 characters.'
  return errors
}

export default function PublicCustomerSignup() {
  const { branding, brandingLogoUrl, tenantName, tenantError, subdomain } = useTenantBranding()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

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

    const errors = validate({ fullName, email, phone, password })
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setIsLoading(true)
    try {
      await signupCustomer(subdomain, {
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      })
      navigate('/')
    } catch (err) {
      setErrorMessage(err.message || 'Could not create your account. Please try again.')
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
          <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">Sign up with {tenantName || 'us'} to get started.</p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400" htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputCls}
                placeholder="Your name"
                autoComplete="name"
              />
              {fieldErrors.fullName ? <p className="mt-1.5 text-sm text-rose-600">{fieldErrors.fullName}</p> : null}
            </div>
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
              {fieldErrors.email ? <p className="mt-1.5 text-sm text-rose-600">{fieldErrors.email}</p> : null}
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400" htmlFor="phone">Phone number</label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputCls}
                placeholder="9876543210"
                autoComplete="tel"
              />
              {fieldErrors.phone ? <p className="mt-1.5 text-sm text-rose-600">{fieldErrors.phone}</p> : null}
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
              {fieldErrors.password ? <p className="mt-1.5 text-sm text-rose-600">{fieldErrors.password}</p> : null}
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
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/portfolio/login" className="font-semibold" style={{ color: ACCENT }}>Sign in</Link>
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
