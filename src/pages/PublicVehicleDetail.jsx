import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Car, Check, ChevronLeft, ChevronRight, Cog, Copy, Fuel, Gauge, Mail, Share2, ShieldCheck, Sparkles } from 'lucide-react'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { fetchPublicInventoryVehicleDetail } from '../utils/publicPortfolio'

// Fixed portfolio theme — same palette as PublicPortfolio.jsx/PublicContact.jsx,
// deliberately NOT the tenant's dynamic brand color (theme.accent/accentSoft).
const ACCENT = '#4B116B'
const ACCENT_SOFT = '#F0E4F5'
const BTN_SHADOW = '0 10px 25px -8px rgba(75, 17, 107, 0.5)'

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function isNewListing(createdAt) {
  if (!createdAt) return false
  const days = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  return days <= 10
}

// Mirrors InventoryFeature.CATEGORY_CHOICES (backend/apps/platform/portfolio/models.py)
// — order here is the column display order below.
const FEATURE_CATEGORY_ORDER = [
  { value: 'comfort_convenience', label: 'Comfort & Convenience' },
  { value: 'safety', label: 'Safety' },
  { value: 'entertainment_communication', label: 'Entertainment & Communication' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'interior', label: 'Interior' },
]

export default function PublicVehicleDetail() {
  const { id } = useParams()
  const { branding, brandingLogoUrl, tenantName, subdomain, tenantError } = useTenantBranding()
  const { showToast } = useToast()

  const [vehicle, setVehicle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [activePhoto, setActivePhoto] = useState(0)
  const thumbScrollRef = useRef(null)
  const featuresScrollRef = useRef(null)

  const scrollThumbs = (dir) => thumbScrollRef.current?.scrollBy({ left: dir * 300, behavior: 'smooth' })
  const scrollFeatures = (dir) => featuresScrollRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' })

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      showToast('success', 'Link copied to clipboard.')
    } catch {
      showToast('error', 'Could not copy link.')
    }
  }

  const handleNativeShare = async () => {
    const shareData = { title: document.title, url: window.location.href }
    if (navigator.share) {
      try { await navigator.share(shareData) } catch { /* user cancelled — ignore */ }
    } else {
      handleCopyLink()
    }
  }

  useEffect(() => {
    if (!subdomain || !id) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setLoadError('')
      try {
        const data = await fetchPublicInventoryVehicleDetail(subdomain, id)
        if (cancelled) return
        setVehicle(data)
        setActivePhoto(0)
      } catch (err) {
        if (cancelled) return
        setLoadError(err.status === 404 ? 'This listing is no longer available.' : (err.message || 'Could not load this vehicle.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [subdomain, id])

  if (tenantError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center text-slate-500">
        <p>This dealership page could not be found.</p>
      </div>
    )
  }

  if (branding?.has_portfolio_access === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center text-slate-500">
        <p>This dealership does not have the Portfolio module enabled.</p>
      </div>
    )
  }

  const photos = vehicle?.photo_urls || []
  // Backend already nulls both fields out once offer_valid_until has passed,
  // so a non-null original_price here always means a live, valid offer.
  const hasOffer = vehicle?.original_price != null && Number(vehicle.original_price) > Number(vehicle.listing_price)
  const offerDaysLeft = hasOffer && vehicle.offer_valid_until
    ? Math.max(1, Math.floor((new Date(`${vehicle.offer_valid_until}T00:00:00`) - new Date(new Date().toDateString())) / 86400000) + 1)
    : 0
  const featureGroups = FEATURE_CATEGORY_ORDER
    .map((cat) => ({ ...cat, features: (vehicle?.key_features_detail || []).filter((f) => f.category === cat.value) }))
    .filter((group) => group.features.length > 0)

  return (
    <div className="min-h-screen bg-[#F6F5FA] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-6 py-4">
          <Link to="/portfolio" className="flex items-center gap-2.5">
            {brandingLogoUrl ? (
              <img src={brandingLogoUrl} alt={tenantName} className="h-9 w-9 rounded-lg object-contain" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: ACCENT_SOFT }}>
                <Car size={18} style={{ color: ACCENT }} />
              </div>
            )}
            <span className="text-lg font-extrabold uppercase tracking-tight text-slate-900">{tenantName || 'Showroom'}</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-500 md:flex">
            <Link to="/portfolio" className="transition hover:text-slate-900">Home</Link>
            <Link to="/portfolio/inventory" className="text-slate-900">Inventory</Link>
            <Link to="/portfolio/contact" className="transition hover:text-slate-900">Contact</Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1240px] px-6 py-10">
        <Link to="/portfolio/inventory" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-900">
          <ArrowLeft size={15} /> Back to inventory
        </Link>

        {loading ? (
          <p className="py-24 text-center text-slate-400">Loading vehicle…</p>
        ) : loadError ? (
          <div className="py-24 text-center">
            <p className="text-slate-500">{loadError}</p>
            <Link to="/portfolio/inventory" className="mt-4 inline-block text-sm font-bold" style={{ color: ACCENT }}>
              View other cars
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
            {/* Photos — one large hero with prev/next arrows overlaid on it,
                plus a thumbnail strip below to jump to a specific photo.
                min-w-0 is required: a grid item's default min-width is "auto"
                (sized to its content), which can force this 1fr track wider
                than the space left after the 380px panel and push that panel
                off-screen — min-w-0 lets it actually shrink to fit. */}
            <div className="min-w-0">
              <div className="relative aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
                {photos[activePhoto] ? (
                  <img
                    src={photos[activePhoto]}
                    alt={`${vehicle.brand_name} ${vehicle.vehicle_model_name} — photo ${activePhoto + 1}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Car size={48} className="text-slate-300" />
                  </div>
                )}
                {isNewListing(vehicle.created_at) ? (
                  <span className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold text-white shadow" style={{ backgroundColor: ACCENT }}>New</span>
                ) : null}
                {photos.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setActivePhoto((p) => (p - 1 + photos.length) % photos.length)}
                      className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePhoto((p) => (p + 1) % photos.length)}
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
                      aria-label="Next photo"
                    >
                      <ChevronRight size={18} />
                    </button>
                    <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white">
                      {activePhoto + 1} / {photos.length}
                    </span>
                  </>
                ) : null}
              </div>

              {photos.length > 1 ? (
                <div className="relative mt-3">
                  <div
                    ref={thumbScrollRef}
                    className="flex gap-2 overflow-x-auto pb-1 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {photos.map((url, i) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setActivePhoto(i)}
                        className="h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition"
                        style={{ borderColor: i === activePhoto ? ACCENT : '#E2E8F0' }}
                      >
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                  {photos.length > 6 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => scrollThumbs(-1)}
                        className="absolute -left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-lg transition hover:text-slate-900"
                        aria-label="Scroll thumbnails left"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollThumbs(1)}
                        className="absolute -right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-lg transition hover:text-slate-900"
                        aria-label="Scroll thumbnails right"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </>
                  ) : null}
                </div>
              ) : null}

              {/* Reasons to Buy */}
              {(vehicle.reasons_to_buy || []).length > 0 ? (
                <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70">
                  <h2 className="text-lg font-extrabold uppercase tracking-tight text-slate-900">Reasons to Buy</h2>
                  <div className="mt-4 divide-y divide-slate-100">
                    {vehicle.reasons_to_buy.map((reason, i) => (
                      <div key={i} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: ACCENT_SOFT, color: ACCENT }}
                        >
                          <Sparkles size={16} />
                        </span>
                        <div>
                          <p className="font-bold text-slate-900">{reason.title}</p>
                          {reason.description ? <p className="mt-0.5 text-sm text-slate-500">{reason.description}</p> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Top Features — one column per category, matching how these are
                  grouped when a listing is created (see AdminInventoryVehicleForm.jsx).
                  A horizontal scroller with a right-edge arrow once there are
                  more categories than comfortably fit. */}
              {featureGroups.length > 0 ? (
                <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70">
                  <h2 className="text-lg font-extrabold uppercase tracking-tight text-slate-900">Top Features of this Car</h2>

                  <div className="relative mt-5">
                    <div
                      ref={featuresScrollRef}
                      className={`flex gap-8 overflow-x-auto pb-1 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${featureGroups.length > 3 ? 'px-9' : ''}`}
                    >
                      {featureGroups.map((group) => (
                        <div key={group.value} className="w-44 shrink-0">
                          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">{group.label}</p>
                          <div className="space-y-2.5">
                            {group.features.map((f) => (
                              <div key={f.name} className="flex items-center gap-2 text-sm text-slate-600">
                                <Check size={14} className="shrink-0" style={{ color: ACCENT }} /> {f.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {featureGroups.length > 3 ? (
                      <>
                        <button
                          type="button"
                          onClick={() => scrollFeatures(-1)}
                          className="absolute -left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-lg transition hover:text-slate-900"
                          aria-label="Scroll features left"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => scrollFeatures(1)}
                          className="absolute -right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-lg transition hover:text-slate-900"
                          aria-label="Scroll features right"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Summary panel — sticks in place on desktop while the photos/
                features on the left keep scrolling underneath it. */}
            <div className="min-w-0 lg:sticky lg:top-[100px] lg:w-[380px] lg:max-h-[calc(100vh-120px)] lg:self-start lg:overflow-y-auto">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70">
                <p className="text-sm font-semibold text-slate-400">{vehicle.brand_name}</p>
                <h1 className="text-2xl font-extrabold text-slate-900">{vehicle.year} {vehicle.vehicle_model_name}</h1>
                <p className="mt-1 text-sm text-slate-500">
                  {Number(vehicle.mileage_km || 0).toLocaleString('en-IN')} km · {vehicle.fuel_type_name} · <span className="capitalize">{vehicle.transmission}</span>
                </p>
                {hasOffer ? (
                  <div className="mt-2">
                    {offerDaysLeft > 0 ? (
                      <p className="text-xs font-semibold text-slate-500">
                        Valid for <span style={{ color: ACCENT }}>{offerDaysLeft} day{offerDaysLeft === 1 ? '' : 's'}</span>
                      </p>
                    ) : null}
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="text-3xl font-extrabold" style={{ color: ACCENT }}>{fmtMoney(vehicle.listing_price)}</p>
                      <p className="text-sm font-semibold text-slate-400 line-through">{fmtMoney(vehicle.original_price)}</p>
                      <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-600">
                        {fmtMoney(vehicle.original_price - vehicle.listing_price)} OFF
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-3xl font-extrabold" style={{ color: ACCENT }}>{fmtMoney(vehicle.listing_price)}</p>
                )}

                <div className="mt-6 grid grid-cols-2 gap-2 text-center text-xs text-slate-500">
                  <div className="flex flex-col items-center gap-1.5 rounded-xl bg-slate-50 py-3">
                    <Gauge size={16} />
                    {Number(vehicle.mileage_km || 0).toLocaleString('en-IN')} km
                  </div>
                  <div className="flex flex-col items-center gap-1.5 rounded-xl bg-slate-50 py-3 capitalize">
                    <Cog size={16} />
                    {vehicle.transmission}
                  </div>
                  <div className="flex flex-col items-center gap-1.5 rounded-xl bg-slate-50 py-3">
                    <Fuel size={16} />
                    {vehicle.fuel_type_name}
                  </div>
                  <div className="flex flex-col items-center gap-1.5 rounded-xl bg-slate-50 py-3">
                    <Car size={16} />
                    {vehicle.vehicle_type_name}
                  </div>
                </div>

                <Link
                  to="/portfolio/contact"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold text-white transition hover:opacity-90"
                  style={{ backgroundColor: ACCENT, boxShadow: BTN_SHADOW }}
                >
                  Contact About This Car
                </Link>

                <div className="mt-5 flex items-center gap-2 text-xs text-slate-400">
                  <ShieldCheck size={14} />
                  Verified listing from {tenantName || 'this dealership'}
                </div>

                <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-5">
                  <span className="text-xs font-semibold text-slate-400">Share:</span>
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:text-slate-900"
                    aria-label="Share this listing"
                  >
                    <Share2 size={14} />
                  </button>
                  <a
                    href={`mailto:?subject=${encodeURIComponent(`${vehicle.year} ${vehicle.brand_name} ${vehicle.vehicle_model_name}`)}&body=${encodeURIComponent(window.location.href)}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:text-slate-900"
                    aria-label="Share via email"
                  >
                    <Mail size={14} />
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:text-slate-900"
                    aria-label="Copy link"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-[1240px] px-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} {tenantName || 'Showroom'}. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
