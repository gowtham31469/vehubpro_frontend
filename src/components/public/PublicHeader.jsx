import { Link } from 'react-router-dom'
import { Car } from 'lucide-react'
import { ACCENT, ACCENT_SOFT } from './theme'

/**
 * Shared homepage header for PublicPortfolio.jsx / PublicServicesHome.jsx /
 * PublicCombinedHome.jsx — one header regardless of which module(s) a tenant
 * has, with nav links shown/hidden per module so the combined variant isn't
 * stuck rendering two separate headers.
 */
export default function PublicHeader({ brandingLogoUrl, tenantName, showInventory, showServices, onHomeClick }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          {brandingLogoUrl ? (
            <img src={brandingLogoUrl} alt={tenantName} className="h-9 w-9 rounded-lg object-contain" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: ACCENT_SOFT }}>
              <Car size={18} style={{ color: ACCENT }} />
            </div>
          )}
          <span className="text-lg font-extrabold uppercase tracking-tight text-slate-900">{tenantName || 'Showroom'}</span>
        </div>
        <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-500 md:flex">
          <button type="button" onClick={onHomeClick} className="text-slate-900">Home</button>
          {showInventory ? (
            <Link to="/portfolio/inventory" className="transition hover:text-slate-900">Inventory</Link>
          ) : null}
          {showServices ? (
            <Link to="/portfolio/services" className="transition hover:text-slate-900">Services</Link>
          ) : null}
          <Link to="/portfolio/contact" className="transition hover:text-slate-900">Contact</Link>
        </nav>
      </div>
    </header>
  )
}
