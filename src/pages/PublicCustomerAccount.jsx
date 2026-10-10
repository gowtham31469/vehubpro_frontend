import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import PublicHeader from '../components/public/PublicHeader.jsx'
import PublicFooter from '../components/public/PublicFooter.jsx'
import { ACCENT, BTN_SHADOW } from '../components/public/theme.js'
import { changePassword, getProfile, isCustomerAuthenticated, updateProfile } from '../utils/customerAuth'

const inputCls = 'mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-300'
const disabledInputCls = 'mt-2 block w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-400 outline-none'

export default function PublicCustomerAccount() {
  const { branding, brandingLogoUrl, tenantName, tenantError } = useTenantBranding()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [profileMessage, setProfileMessage] = useState('')
  const [profileError, setProfileError] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const hasPortfolio = branding?.has_portfolio_access === true
  const hasServices = branding?.has_services_access === true

  useEffect(() => {
    if (!isCustomerAuthenticated()) {
      navigate('/portfolio/login')
      return
    }
    getProfile()
      .then((data) => {
        setFullName(data.full_name || '')
        setEmail(data.email || '')
      })
      .catch(() => setProfileError('Could not load your profile.'))
      .finally(() => setLoading(false))
  }, [navigate])

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

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setProfileMessage('')
    setProfileError('')
    if (!fullName.trim()) {
      setProfileError('Name is required.')
      return
    }
    setSavingProfile(true)
    try {
      await updateProfile(fullName.trim())
      setProfileMessage('Profile updated successfully.')
    } catch (err) {
      setProfileError(err.message || 'Could not update your profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordMessage('')
    setPasswordError('')
    if (!currentPassword || !newPassword) {
      setPasswordError('Please fill in all password fields.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.')
      return
    }
    setSavingPassword(true)
    try {
      await changePassword({ currentPassword, newPassword })
      setPasswordMessage('Password changed successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(err.message || 'Could not change your password.')
    } finally {
      setSavingPassword(false)
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

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-14">
        <h1 className="text-2xl font-bold text-slate-900">My Account</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your profile and password.</p>

        {loading ? (
          <p className="mt-8 text-sm text-slate-400">Loading…</p>
        ) : (
          <div className="mt-8 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Profile</h2>
              <form className="mt-5 space-y-5" onSubmit={handleSaveProfile} noValidate>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-400" htmlFor="fullName">Name</label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-400" htmlFor="accountEmail">Email</label>
                  <input id="accountEmail" type="email" value={email} disabled className={disabledInputCls} />
                  <p className="mt-1.5 text-xs text-slate-400">Email can't be changed.</p>
                </div>

                {profileMessage ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{profileMessage}</div>
                ) : null}
                {profileError ? (
                  <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{profileError}</div>
                ) : null}

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-xl px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ backgroundColor: ACCENT, boxShadow: BTN_SHADOW }}
                >
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Change Password</h2>
              <form className="mt-5 space-y-5" onSubmit={handleChangePassword} noValidate>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-400" htmlFor="currentPassword">Current Password</label>
                  <input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={inputCls}
                    autoComplete="current-password"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-400" htmlFor="newPassword">New Password</label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputCls}
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-400" htmlFor="confirmPassword">Confirm New Password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputCls}
                    autoComplete="new-password"
                  />
                </div>

                {passwordMessage ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{passwordMessage}</div>
                ) : null}
                {passwordError ? (
                  <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{passwordError}</div>
                ) : null}

                <button
                  type="submit"
                  disabled={savingPassword}
                  className="rounded-xl px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ backgroundColor: ACCENT, boxShadow: BTN_SHADOW }}
                >
                  {savingPassword ? 'Saving...' : 'Change Password'}
                </button>
              </form>
            </div>
          </div>
        )}
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
