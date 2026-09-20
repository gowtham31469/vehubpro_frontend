import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { ArrowRight, Camera, Car, CheckCircle2, Clock3, MessageSquare, Phone } from 'lucide-react'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'

// Fixed portfolio theme — same palette as the other Public*.jsx pages,
// deliberately NOT the tenant's dynamic brand color.
const ACCENT = '#4B116B'
const TEAL = '#0F766E'
const TEAL_SOFT = '#CCFBF1'

export default function PublicLanding() {
  const { branding, brandingLogoUrl, tenantName, tenantError } = useTenantBranding()
  const [qrDataUrl, setQrDataUrl] = useState('')

  const instagramHandle = branding?.instagram_handle || ''
  const whatsappNumber = branding?.whatsapp_number || ''
  const businessHours = branding?.business_hours || ''
  const phone = branding?.phone || ''
  // Only a definitive `false` from the server hides the portfolio button —
  // undefined (still loading / stale cached branding) should not flash it away.
  const hasPortfolioAccess = branding?.has_portfolio_access !== false

  useEffect(() => {
    let cancelled = false
    async function generate() {
      if (!instagramHandle) {
        setQrDataUrl('')
        return
      }
      try {
        const url = await QRCode.toDataURL(`https://instagram.com/${instagramHandle}`, {
          margin: 1,
          width: 200,
          color: { dark: ACCENT, light: '#FFFFFF' },
        })
        if (!cancelled) setQrDataUrl(url)
      } catch {
        if (!cancelled) setQrDataUrl('')
      }
    }
    void generate()
    return () => { cancelled = true }
  }, [instagramHandle])

  if (tenantError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center text-slate-500">
        <p>This dealership page could not be found.</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen items-center justify-center overflow-hidden bg-[#F6F5FA] px-4 py-4 font-sans">
      {/* max-h-full + overflow-y-auto is a safety net for very short viewports
          only — the page itself never scrolls (h-screen overflow-hidden above);
          sizing below is deliberately compact so this card fits in one view
          on ordinary desktop/laptop heights without needing that scroll. */}
      <div className="flex max-h-full w-full max-w-[460px] flex-col overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_45px_-15px_rgba(15,23,42,0.15)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Identity */}
        <div className="text-center">
          <div className="relative mx-auto h-14 w-14">
            {brandingLogoUrl ? (
              <img src={brandingLogoUrl} alt={tenantName} className="h-14 w-14 rounded-2xl object-contain" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: ACCENT }}>
                <Car size={24} className="text-white" />
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white" style={{ backgroundColor: TEAL }}>
              <CheckCircle2 size={11} className="text-white" />
            </span>
          </div>
          <h1 className="mt-2.5 text-2xl font-extrabold tracking-tight" style={{ color: ACCENT }}>{tenantName || 'Showroom'}</h1>
          <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: TEAL }}>Powered by VeHubPro</p>
          <span
            className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold"
            style={{ backgroundColor: TEAL_SOFT, color: TEAL }}
          >
            <CheckCircle2 size={12} /> Certified VeHubPro Dealer
          </span>
        </div>

        {/* Instagram QR */}
        {instagramHandle ? (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-center">
            <div className="mx-auto flex h-[120px] w-[120px] items-center justify-center rounded-xl bg-white p-2.5 shadow-sm">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt={`Instagram QR code for @${instagramHandle}`} className="h-full w-full" />
              ) : (
                <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />
              )}
            </div>
            <div className="mt-2.5 flex items-center justify-center gap-2">
              <span className="text-sm font-bold text-slate-900">@{instagramHandle}</span>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: TEAL_SOFT, color: TEAL }}>
                INSTAGRAM
              </span>
            </div>
            <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">
              Scan with camera to view latest arrivals, deliveries & stories on Instagram
            </p>
            <a
              href={`https://instagram.com/${instagramHandle}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2.5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold shadow-sm transition hover:bg-slate-50"
              style={{ color: ACCENT }}
            >
              <Camera size={14} /> Follow on Instagram
            </a>
          </div>
        ) : null}

        {/* Portfolio */}
        {hasPortfolioAccess ? (
          <Link
            to="/portfolio"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold text-white shadow-[0_10px_25px_-8px_rgba(75,17,107,0.5)] transition hover:opacity-90"
            style={{ backgroundColor: ACCENT }}
          >
            View Car Portfolio <ArrowRight size={16} />
          </Link>
        ) : null}

        {/* WhatsApp / phone */}
        {whatsappNumber || phone ? (
          <div className={`mt-2.5 grid gap-2.5 ${whatsappNumber && phone ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {whatsappNumber ? (
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                style={{ backgroundColor: TEAL }}
              >
                <MessageSquare size={14} /> WhatsApp Concierge
              </a>
            ) : null}
            {phone ? (
              <a
                href={`tel:${phone}`}
                className="flex items-center justify-center gap-2 rounded-full bg-slate-100 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
              >
                <Phone size={14} /> {phone}
              </a>
            ) : null}
          </div>
        ) : null}

        {/* Hours */}
        {businessHours ? (
          <div className="mt-3 flex items-center justify-between rounded-xl border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Clock3 size={13} /> Direct Sales & Inquiries
            </span>
            <span className="font-bold text-slate-700">{businessHours}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
