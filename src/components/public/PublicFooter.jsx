import { Link } from 'react-router-dom'

/**
 * Shared homepage footer — see PublicHeader.jsx for why this is a shared
 * component rather than duplicated per homepage variant.
 */
export default function PublicFooter({ brandingLogoUrl, tenantName, branding, showInventory, showServices, onHomeClick }) {
  return (
    <footer className="border-t border-slate-200 bg-white py-10">
      <div className="mx-auto max-w-[1240px] px-6">
        <div className="flex flex-col items-center justify-between gap-6 text-center sm:flex-row sm:items-start sm:text-left">
          <div>
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              {brandingLogoUrl ? (
                <img src={brandingLogoUrl} alt={tenantName} className="h-7 w-7 rounded object-contain" />
              ) : null}
              <span className="text-lg font-extrabold uppercase tracking-tight text-slate-900">{tenantName || 'Showroom'}</span>
            </div>
            <p className="mt-2 max-w-xs text-sm text-slate-400">
              {branding?.address || 'Quality service, straightforward pricing — browse what we offer or get in touch.'}
            </p>
            {branding?.phone ? (
              <a href={`tel:${branding.phone}`} className="mt-1 inline-block text-sm text-slate-500 hover:text-slate-900">
                {branding.phone}
              </a>
            ) : null}
          </div>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-slate-500 sm:justify-end">
            <button type="button" onClick={onHomeClick} className="hover:text-slate-900">Home</button>
            {showInventory ? (
              <Link to="/portfolio/inventory" className="hover:text-slate-900">Inventory</Link>
            ) : null}
            {showServices ? (
              <Link to="/portfolio/services" className="hover:text-slate-900">Services</Link>
            ) : null}
            <Link to="/portfolio/contact" className="hover:text-slate-900">Contact</Link>
          </div>
        </div>
        <div className="mt-8 border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} {tenantName || 'Showroom'}. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
