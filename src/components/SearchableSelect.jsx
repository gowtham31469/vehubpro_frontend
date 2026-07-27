import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'

/**
 * Dropdown select with an in-panel search box for filtering long option lists
 * (e.g. states, cities). Options: [{ id, name }].
 */
export default function SearchableSelect({
  id,
  value,
  options,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  disabled = false,
  loading = false,
  loadingLabel = 'Loading…',
  accent,
  accentSoft,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)
  const searchInputRef = useRef(null)

  const selected = options.find((o) => String(o.id) === String(value))

  useEffect(() => {
    if (!open) return undefined
    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    setQuery('')
    const raf = requestAnimationFrame(() => searchInputRef.current?.focus())
    return () => cancelAnimationFrame(raf)
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.name.toLowerCase().includes(q))
  }, [options, query])

  return (
    <div className="relative" ref={rootRef}>
      <button
        id={id}
        type="button"
        disabled={disabled || loading}
        onClick={() => { if (disabled || loading) return; setOpen((prev) => !prev) }}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-9 text-left text-sm font-medium text-slate-700 outline-none transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
      >
        {loading ? loadingLabel : selected?.name || placeholder}
      </button>
      <ChevronDown
        size={16}
        className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition ${open ? 'rotate-180' : ''}`}
      />
      {open ? (
        <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-700">
            <Search size={14} className="shrink-0 text-slate-400" />
            <input
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>
          <div className="max-h-52 overflow-auto">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${!value ? 'font-semibold' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'}`}
              style={!value ? { backgroundColor: accentSoft, color: accent } : undefined}
            >
              {!value ? <Check size={14} /> : <span className="w-[14px]" />}
              {placeholder}
            </button>
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-center text-sm text-slate-400">No matches found.</p>
            ) : (
              filtered.map((opt) => {
                const sel = String(value) === String(opt.id)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => { onChange(String(opt.id)); setOpen(false) }}
                    className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${sel ? 'font-semibold' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                    style={sel ? { backgroundColor: accentSoft, color: accent } : undefined}
                  >
                    {sel ? <Check size={14} /> : <span className="w-[14px]" />}
                    {opt.name}
                  </button>
                )
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
