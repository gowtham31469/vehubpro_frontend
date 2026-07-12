import {
  Briefcase, Car, ChevronDown, ClipboardList, LayoutGrid, LogOut,
  Monitor, Moon, PanelLeftClose, PanelLeftOpen, ReceiptText,
  Settings2, SlidersHorizontal, Sun, Users,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import ReactDOM from 'react-dom'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { clearSession, getCurrentUser } from '../utils/apiClient'
import { fetchUserNavModules } from '../utils/modules.js'
import { useState, useRef, useEffect } from 'react'

const SIDEBAR_KEY = 'vehubpro_admin_sidebar_collapsed'

// Maps backend module key → { icon, to }
const MODULE_META = {
  'dashboard':         { icon: LayoutGrid,        to: '/admin/dashboard' },
  'customers':         { icon: Users,             to: '/admin/customers' },
  'service-vehicles':  { icon: Car,               to: '/admin/service-vehicles' },
  'job-cards':         { icon: ClipboardList,     to: '/admin/job-cards' },
  'invoices':          { icon: ReceiptText,       to: '/admin/invoices' },
  'services':          { icon: Settings2,         to: '/admin/services' },
  'configuration':     { icon: SlidersHorizontal, to: '/admin/configuration' },
  'user_management':   { icon: Users,             to: '/admin/users' },
  'portfolio':         { icon: Briefcase,         to: '/admin/portfolio' },
}

// Explicit overrides for submodule keys → real frontend routes.
// Add entries here as new submodule keys are defined in the backend.
const SUBMODULE_ROUTE_MAP = {
  // Customers
  'customer-management': '/admin/customers',
  'customer_management': '/admin/customers',
  'customers':           '/admin/customers',

  // Job Cards
  'job-cards':           '/admin/job-cards',
  'job_cards':           '/admin/job-cards',
  'jobcards':            '/admin/job-cards',
  'job-card':            '/admin/job-cards',
  'job-card-list':       '/admin/job-cards',

  // Invoices
  'invoices':            '/admin/invoices',
  'invoice-list':        '/admin/invoices',
  'invoice_list':        '/admin/invoices',

  // Service Vehicles
  'service-vehicles':    '/admin/service-vehicles',
  'service_vehicles':    '/admin/service-vehicles',
  'servicevehicles':     '/admin/service-vehicles',
  'vehicles':            '/admin/service-vehicles',

  // Services / Services Master
  'services-master':     '/admin/services',
  'services_master':     '/admin/services',
  'service-master':      '/admin/services',
  'service-list':        '/admin/services',
  'service-categories':  '/admin/services',
  'service-items':       '/admin/services',
  'services':            '/admin/services',

  // Insights
  'insights':            '/admin/insights',
  'insight':             '/admin/insights',
  // Dashboard / Overview
  'overview':            '/admin/dashboard',
  'analytics':           '/admin/dashboard',
  'dashboard':           '/admin/dashboard',

  // Configuration
  'configuration':       '/admin/configuration',
  'config':              '/admin/configuration',
  'settings':            '/admin/configuration',

  // User Management
  'user_management':     '/admin/users',
  'user-management':     '/admin/users',
  'users':               '/admin/users',

  // Portfolio
  'portfolio':           '/admin/portfolio',
  'portfolio_insights':  '/admin/portfolio',
  'inventory_vehicles':  '/admin/portfolio/inventory',
  'inventory-vehicles':  '/admin/portfolio/inventory',
}

// Normalize to kebab-case for fuzzy matching (handles snake_case, spaces, mixed case)
const normalize = (s) => s.toLowerCase().replace(/[\s_]+/g, '-')

function lookupInMaps(norm) {
  for (const [k, meta] of Object.entries(MODULE_META)) {
    if (normalize(k) === norm) return meta.to
  }
  for (const [k, route] of Object.entries(SUBMODULE_ROUTE_MAP)) {
    if (normalize(k) === norm) return route
  }
  return null
}

// Resolves a submodule to a real frontend route using key AND name as signals.
// Priority: exact key → fuzzy key → fuzzy name → parent module fallback
function resolveSubmoduleRoute(moduleKey, submoduleKey, submoduleName = '') {
  // 1. Exact match on key
  if (MODULE_META[submoduleKey]) return MODULE_META[submoduleKey].to
  if (SUBMODULE_ROUTE_MAP[submoduleKey]) return SUBMODULE_ROUTE_MAP[submoduleKey]

  // 2. Fuzzy match on key
  const byKey = lookupInMaps(normalize(submoduleKey))
  if (byKey) return byKey

  // 3. Fuzzy match on display name (backend key may be unrelated to route)
  if (submoduleName) {
    const byName = lookupInMaps(normalize(submoduleName))
    if (byName) return byName
  }

  // 4. Fallback to parent module route
  return MODULE_META[moduleKey]?.to || '/admin/dashboard'
}

const FALLBACK_NAV = [
  { key: 'dashboard',        name: 'Dashboard',        submodules: [] },
  { key: 'customers',        name: 'Customers',        submodules: [] },
  { key: 'service-vehicles', name: 'Service Vehicles', submodules: [] },
  { key: 'job-cards',        name: 'Job Cards',        submodules: [] },
  { key: 'invoices',         name: 'Invoices',         submodules: [] },
  { key: 'services',         name: 'Services',         submodules: [] },
  { key: 'configuration',    name: 'Configuration',    submodules: [] },
]

const NAV_CACHE_KEY = 'vehubpro_nav_modules'

function getCachedNav() {
  try {
    const raw = sessionStorage.getItem(NAV_CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function setCachedNav(modules) {
  try { sessionStorage.setItem(NAV_CACHE_KEY, JSON.stringify(modules)) } catch {}
}

// ── Direct link nav item ──────────────────────────────────────────────────────
function SidebarLink({ to, label, icon: Icon, accent, collapsed }) {
  const { pathname } = useLocation()
  const active = pathname === to || (to !== '/admin' && pathname.startsWith(to + '/'))

  return (
    <Link
      to={to}
      title={collapsed ? label : undefined}
      className={`flex w-full items-center rounded-xl transition-all duration-200 ${
        collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
      } ${
        active
          ? 'text-white'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
      }`}
      style={active ? { backgroundColor: accent } : undefined}
    >
      <Icon size={19} strokeWidth={2.2} />
      {!collapsed && <span className="text-[15px] font-medium leading-none">{label}</span>}
    </Link>
  )
}

// ── Submodule child link ──────────────────────────────────────────────────────
function SidebarSubLink({ to, label, accent }) {
  const { pathname } = useLocation()
  const active = pathname === to || pathname.startsWith(to + '/')

  return (
    <Link
      to={to}
      className={`flex w-full items-center gap-2 rounded-lg px-4 py-2 text-[13.5px] font-medium transition-all duration-150 ${
        active
          ? 'text-white'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
      }`}
      style={active ? { backgroundColor: accent } : undefined}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? 'bg-white' : 'bg-slate-300 dark:bg-slate-600'}`}
      />
      {label}
    </Link>
  )
}

// ── Accordion nav item (multi-submodule) ──────────────────────────────────────
function SidebarAccordion({ moduleKey, label, icon: Icon, accent, collapsed, submodules }) {
  const { pathname } = useLocation()
  const childRoutes = submodules.map((s) => resolveSubmoduleRoute(moduleKey, s.key, s.name))
  const isParentActive = childRoutes.some((r) => pathname === r || pathname.startsWith(r + '/'))
  const [open, setOpen] = useState(isParentActive)

  useEffect(() => {
    if (isParentActive) setOpen(true)
  }, [isParentActive])

  if (collapsed) {
    return (
      <button
        type="button"
        title={label}
        className={`flex w-full items-center justify-center rounded-xl px-0 py-3 transition-all duration-200 ${
          isParentActive
            ? 'text-white'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
        }`}
        style={isParentActive ? { backgroundColor: accent } : undefined}
      >
        <Icon size={19} strokeWidth={2.2} />
      </button>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 ${
          isParentActive && !open
            ? 'text-white'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
        }`}
        style={isParentActive && !open ? { backgroundColor: accent } : undefined}
      >
        <Icon size={19} strokeWidth={2.2} className="shrink-0" />
        <span className="flex-1 text-left text-[15px] font-medium leading-none">{label}</span>
        <ChevronDown
          size={14}
          strokeWidth={2.5}
          className={`shrink-0 text-slate-400 transition-transform duration-300 ${open ? 'rotate-0' : '-rotate-90'}`}
        />
      </button>

      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: open ? `${submodules.length * 44}px` : '0px' }}
      >
        <div className="mt-0.5 ml-3 space-y-0.5 border-l border-slate-200 pb-1 pl-3 dark:border-slate-700/60">
          {submodules.map((sub) => (
            <SidebarSubLink
              key={sub.key}
              to={resolveSubmoduleRoute(moduleKey, sub.key, sub.name)}
              label={sub.name}
              accent={accent}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Nav item dispatcher ───────────────────────────────────────────────────────
function NavItem({ module, accent, collapsed }) {
  const meta = MODULE_META[module.key]
  if (!meta) return null

  const { submodules = [] } = module

  if (submodules.length > 1) {
    return (
      <SidebarAccordion
        moduleKey={module.key}
        label={module.name}
        icon={meta.icon}
        accent={accent}
        collapsed={collapsed}
        submodules={submodules}
      />
    )
  }

  // Single submodule or none → direct link using module's canonical route
  return (
    <SidebarLink
      to={meta.to}
      label={module.name}
      icon={meta.icon}
      accent={accent}
      collapsed={collapsed}
    />
  )
}

// ── Shell ─────────────────────────────────────────────────────────────────────
export default function AdminShell({ children }) {
  const { theme, themeMode, setThemeMode, brandingLogoUrl, tenantName } = useTenantBranding()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)
  const [profilePos, setProfilePos] = useState({ top: 0, right: 0 })
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_KEY) === '1'
  )
  const [navModules, setNavModules] = useState(() => getCachedNav() || FALLBACK_NAV)
  const profileRef = useRef(null)
  const profileButtonRef = useRef(null)
  const user = getCurrentUser()

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0')
      return next
    })
  }

  useEffect(() => {
    let cancelled = false
    fetchUserNavModules()
      .then((modules) => {
        if (cancelled || !Array.isArray(modules) || modules.length === 0) return
        const valid = modules.filter((m) => MODULE_META[m.key])
        if (valid.length > 0) {
          setCachedNav(valid)
          setNavModules(valid)
        }
      })
      .catch(() => {/* keep cached/fallback nav */})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        profileRef.current && !profileRef.current.contains(e.target) &&
        profileButtonRef.current && !profileButtonRef.current.contains(e.target)
      ) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!profileOpen || !profileButtonRef.current) return
    const updatePosition = () => {
      if (profileButtonRef.current) {
        const rect = profileButtonRef.current.getBoundingClientRect()
        setProfilePos({ top: rect.bottom + 12, right: window.innerWidth - rect.right })
      }
    }
    updatePosition()
    const header = profileButtonRef.current?.closest('header')
    if (header) header.addEventListener('scroll', updatePosition, { passive: true })
    window.addEventListener('scroll', updatePosition, { passive: true })
    window.addEventListener('resize', updatePosition, { passive: true })
    return () => {
      if (header) header.removeEventListener('scroll', updatePosition)
      window.removeEventListener('scroll', updatePosition)
      window.removeEventListener('resize', updatePosition)
    }
  }, [profileOpen])

  const handleLogout = () => {
    clearSession()
    navigate('/admin')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-[#020617] transition-colors duration-500">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        className={`hidden shrink-0 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 lg:flex transition-all duration-300 ease-in-out ${
          collapsed ? 'w-[68px]' : 'w-[280px]'
        }`}
      >
        {/* Logo */}
        <div className={`flex h-24 items-center border-b border-slate-100 dark:border-slate-800 transition-all duration-300 ${collapsed ? 'justify-center px-2' : 'justify-center px-4'}`}>
          {collapsed ? (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white font-black text-xl uppercase shadow-sm tracking-wide"
              style={{ backgroundColor: theme.accent }}
            >
              {(tenantName || user?.full_name || 'V')[0]}
            </div>
          ) : (
            <img
              src={brandingLogoUrl || '/logo.png'}
              alt={tenantName || 'VeHubPro'}
              className="h-20 w-full object-contain"
            />
          )}
        </div>

        {/* Nav items */}
        <nav className={`flex-1 space-y-1 overflow-y-auto py-6 transition-all duration-300 ${collapsed ? 'px-2' : 'px-3'}`}>
          {navModules.map((module) => (
            <NavItem
              key={module.key}
              module={module}
              accent={theme.accent}
              collapsed={collapsed}
            />
          ))}
        </nav>

        {/* Toggle button */}
        <div className="border-t border-slate-100 dark:border-slate-800 p-3">
          <button
            type="button"
            onClick={toggleSidebar}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex w-full items-center justify-center rounded-xl p-2.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            {collapsed
              ? <PanelLeftOpen size={18} strokeWidth={2} />
              : <PanelLeftClose size={18} strokeWidth={2} />
            }
          </button>
        </div>
      </aside>

      {/* ── Main container ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Header */}
        <header className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200 dark:border-slate-800/60 bg-white/80 dark:bg-[#020617]/80 px-8 backdrop-blur-xl transition-colors">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {tenantName ? `${tenantName} — Staff Portal` : 'VeHubPro Staff Portal'}
          </h2>

          <div className="flex items-center gap-6">

            {/* Theme toggle */}
            <div className="flex items-center rounded-full bg-slate-100 dark:bg-slate-800 p-1 shadow-inner">
              <button
                onClick={() => setThemeMode('light')}
                className={`flex items-center justify-center rounded-full p-2 transition-all ${themeMode === 'light' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
              >
                <Sun size={16} />
              </button>
              <button
                onClick={() => setThemeMode('system')}
                className={`flex items-center justify-center rounded-full p-2 transition-all ${themeMode === 'system' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
              >
                <Monitor size={16} />
              </button>
              <button
                onClick={() => setThemeMode('dark')}
                className={`flex items-center justify-center rounded-full p-2 transition-all ${themeMode === 'dark' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
              >
                <Moon size={16} />
              </button>
            </div>

            {/* Profile dropdown */}
            <button
              ref={profileButtonRef}
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 py-1.5 pl-1.5 pr-4 transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
                style={{ backgroundColor: theme.accent }}
              >
                {user?.full_name ? user.full_name[0].toUpperCase() : 'A'}
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {user?.full_name || 'Account'}
              </span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
            </button>

            {profileOpen && ReactDOM.createPortal(
              <div
                ref={profileRef}
                className="fixed z-[9999] w-60 origin-top-right rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 shadow-2xl"
                style={{ top: `${profilePos.top}px`, right: `${profilePos.right}px` }}
              >
                <div className="mb-1 border-b border-slate-100 dark:border-slate-700 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Signed in as</p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-white">
                    {user?.email || 'user@example.com'}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
                >
                  <LogOut size={16} strokeWidth={2.4} />
                  Logout
                </button>
              </div>,
              document.body
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-[#020617] p-3 md:p-6 transition-colors">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
