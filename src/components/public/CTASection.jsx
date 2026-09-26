import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { ACCENT } from './theme'

/** Closing call-to-action banner, shared across all homepage variants. */
export default function CTASection({ heading, subtext, buttonLabel = 'Contact Us', buttonTo = '/portfolio/contact' }) {
  return (
    <section className="px-6 py-16">
      <div
        className="relative mx-auto max-w-[1240px] overflow-hidden rounded-3xl px-8 py-14 text-center text-white"
        style={{ backgroundColor: ACCENT, boxShadow: '0 25px 50px -15px rgba(75, 17, 107, 0.45)' }}
      >
        <ShieldCheck size={140} className="pointer-events-none absolute -right-6 -top-6 text-white/10" />
        <h2 className="text-3xl font-extrabold uppercase tracking-tight">{heading}</h2>
        <p className="mx-auto mt-3 max-w-xl text-white/85">{subtext}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to={buttonTo}
            className="rounded-full bg-white px-6 py-3 text-sm font-bold shadow transition hover:bg-slate-100"
            style={{ color: ACCENT }}
          >
            {buttonLabel}
          </Link>
        </div>
      </div>
    </section>
  )
}
