import { Check, Info, ShieldAlert, TriangleAlert, X } from 'lucide-react'
import { createContext, useCallback, useContext, useState } from 'react'

// ─── Variant styles ──────────────────────────────────────────────────────────

const VARIANTS = {
  success: {
    container: 'border-emerald-200/80 bg-emerald-50/90 text-emerald-900',
    icon: 'bg-emerald-100 text-emerald-700',
    label: 'Success',
    Icon: Check,
  },
  error: {
    container: 'border-rose-200/80 bg-rose-50/90 text-rose-900',
    icon: 'bg-rose-100 text-rose-700',
    label: 'Error',
    Icon: ShieldAlert,
  },
  warning: {
    container: 'border-amber-200/80 bg-amber-50/90 text-amber-900',
    icon: 'bg-amber-100 text-amber-700',
    label: 'Warning',
    Icon: TriangleAlert,
  },
  info: {
    container: 'border-sky-200/80 bg-sky-50/90 text-sky-900',
    icon: 'bg-sky-100 text-sky-700',
    label: 'Info',
    Icon: Info,
  },
}

const AUTO_DISMISS_MS = 3500

// ─── Toast renderer (portal-style fixed stack) ───────────────────────────────

function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[9999] w-[340px] max-w-[calc(100vw-2rem)] space-y-2">
      {toasts.map((toast) => {
        const styles = VARIANTS[toast.variant] ?? VARIANTS.error
        const { Icon } = styles
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-3.5 shadow-xl backdrop-blur-md ${styles.container}`}
          >
            <div className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${styles.icon}`}>
              <Icon size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] opacity-70">{styles.label}</p>
              <p className="mt-0.5 text-sm font-medium leading-snug">{toast.message}</p>
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => onDismiss(toast.id)}
              className="rounded-lg p-1.5 text-current/60 transition hover:bg-black/5"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext(null)

// ─── Provider ────────────────────────────────────────────────────────────────

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((variant, message) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    setToasts((prev) => [...prev, { id, variant, message }])
    globalThis.setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useToast — call anywhere inside <ToastProvider>
 *
 * const { showToast } = useToast()
 * showToast('success', 'Vehicle registered.')
 * showToast('error',   'Something went wrong.')
 * showToast('warning', 'Session will expire soon.')
 * showToast('info',    'Syncing data…')
 */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
