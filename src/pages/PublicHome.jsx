import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import PublicPortfolio from './PublicPortfolio.jsx'
import PublicServicesHome from './PublicServicesHome.jsx'
import PublicCombinedHome from './PublicCombinedHome.jsx'

/**
 * Root "/" route — decides which homepage variant to render based on which
 * module(s) this tenant has enabled. branding.has_portfolio_access /
 * has_services_access come from the public branding endpoint
 * (PublicTenantBrandingAPIView), which always returns both flags regardless
 * of module access (unlike the Public*.jsx sub-pages, which each gate
 * themselves on their own single flag).
 */
export default function PublicHome() {
  const { branding, tenantError } = useTenantBranding()

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

  // branding starts as a cached/default object before the real fetch
  // resolves — has_portfolio_access/has_services_access are only present
  // once real data has loaded, so treat their absence as "still loading"
  // rather than "neither module enabled".
  const stillLoading = branding?.has_portfolio_access === undefined && branding?.has_services_access === undefined
  if (stillLoading) {
    return <div className="min-h-screen bg-[#F6F5FA]" />
  }

  const hasPortfolio = branding?.has_portfolio_access === true
  const hasServices = branding?.has_services_access === true

  if (hasPortfolio && hasServices) return <PublicCombinedHome />
  if (hasPortfolio) return <PublicPortfolio />
  if (hasServices) return <PublicServicesHome />

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 text-center text-slate-900">
      <div>
        <h1 className="text-xl font-bold">Site Not Set Up Yet</h1>
        <p className="mt-2 text-sm text-slate-500">This dealership doesn't have the Portfolio or Services module enabled.</p>
      </div>
    </div>
  )
}
