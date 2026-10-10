import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, Heart, LogOut, User } from 'lucide-react'
import { ACCENT, ACCENT_SOFT } from './theme'
import { getCustomerUser, isCustomerAuthenticated, logoutCustomer } from '../../utils/customerAuth'

/**
 * Shared "Login" link / logged-in avatar dropdown for every public page's
 * header — reused instead of duplicating auth-state branching per page.
 */
export default function AccountNav({ className = 'transition hover:text-slate-900' }) {
  const navigate = useNavigate()
  const authed = isCustomerAuthenticated()
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  if (!authed) {
    return <Link to="/portfolio/login" className={className}>Login</Link>
  }

  const user = getCustomerUser()
  const fullName = (user?.full_name || '').trim() || 'Account'
  const firstName = fullName.split(' ')[0]
  const initial = fullName.charAt(0).toUpperCase()

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition hover:bg-slate-100"
      >
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          style={{ backgroundColor: ACCENT_SOFT, color: ACCENT }}
        >
          {initial}
        </span>
        <span className="text-slate-900">{firstName}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-40 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 text-left shadow-lg">
          <div className="border-b border-slate-100 px-4 py-2.5">
            <p className="truncate text-sm font-semibold text-slate-900">{fullName}</p>
            {user?.email ? <p className="truncate text-xs text-slate-400">{user.email}</p> : null}
          </div>
          <Link
            to="/portfolio/account"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <User size={15} />
            My Profile
          </Link>
          <Link
            to="/portfolio/wishlist"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Heart size={15} />
            My Wishlist
          </Link>
          <button
            type="button"
            onClick={() => {
              logoutCustomer()
              setOpen(false)
              navigate('/')
            }}
            className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      ) : null}
    </div>
  )
}
