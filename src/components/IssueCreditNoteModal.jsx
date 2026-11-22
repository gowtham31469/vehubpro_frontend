import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import SearchableSelect from './SearchableSelect'
import { fetchCreditNotes, fetchReasonCategories, generateCreditNote } from '../utils/creditNotes'

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100'
const labelCls = 'mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400'

export default function IssueCreditNoteModal({ invoice, onClose, onSuccess }) {
  const { theme } = useTenantBranding()
  const [mode, setMode] = useState('full') // 'full' | 'partial'
  const [selectedLines, setSelectedLines] = useState({}) // { [lineId]: amountString }
  const [customAmount, setCustomAmount] = useState('')
  const [customGstPercentage, setCustomGstPercentage] = useState('')
  const [reason, setReason] = useState('')
  const [reasonCategory, setReasonCategory] = useState('')
  const [reasonCategories, setReasonCategories] = useState([])
  const [creditedSoFar, setCreditedSoFar] = useState(null) // null while loading
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const lineItems = invoice.line_items || []

  useEffect(() => {
    fetchCreditNotes({ invoiceId: invoice.id, status: 'issued', pageSize: 100 })
      .then((data) => {
        const rows = data?.results || []
        const sum = rows.reduce((acc, r) => acc + Number(r.total_amount || 0), 0)
        setCreditedSoFar(sum)
      })
      .catch(() => setCreditedSoFar(0))
  }, [invoice.id])

  useEffect(() => {
    fetchReasonCategories({ isActive: true })
      .then((rows) => setReasonCategories(rows))
      .catch(() => setReasonCategories([]))
  }, [])

  const creditableRemaining = useMemo(() => {
    if (creditedSoFar === null) return null
    return Math.max(0, Number(invoice.total_amount || 0) - creditedSoFar)
  }, [creditedSoFar, invoice.total_amount])

  const runningTotal = useMemo(() => {
    if (mode === 'full') return creditableRemaining || 0
    const linesTotal = Object.values(selectedLines).reduce((acc, v) => acc + (Number(v) || 0), 0)
    return linesTotal + (Number(customAmount) || 0)
  }, [mode, selectedLines, customAmount, creditableRemaining])

  const toggleLine = (line) => {
    setSelectedLines((prev) => {
      const next = { ...prev }
      if (line.id in next) {
        delete next[line.id]
      } else {
        next[line.id] = String(line.line_total)
      }
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!reason.trim()) {
      setError('A reason is required.')
      return
    }
    if (runningTotal <= 0) {
      setError('The credited amount must be greater than zero.')
      return
    }
    if (creditableRemaining !== null && runningTotal > creditableRemaining + 0.01) {
      setError(`This exceeds the remaining creditable amount (${fmtMoney(creditableRemaining)}).`)
      return
    }

    setSaving(true)
    try {
      const reasonCategoryName = reasonCategories.find((c) => String(c.id) === String(reasonCategory))?.name || ''
      let payload
      if (mode === 'full') {
        payload = {
          reason: reason.trim(),
          reason_category: reasonCategoryName,
          line_item_credits: lineItems.map((line) => ({
            invoice_line_item_id: line.id,
            amount: line.line_total,
          })),
        }
      } else {
        const line_item_credits = Object.entries(selectedLines)
          .filter(([, amount]) => Number(amount) > 0)
          .map(([invoice_line_item_id, amount]) => ({ invoice_line_item_id, amount: Number(amount) }))
        payload = {
          reason: reason.trim(),
          reason_category: reasonCategoryName,
          ...(line_item_credits.length ? { line_item_credits } : {}),
          ...(Number(customAmount) > 0 ? {
            custom_amount: Number(customAmount),
            ...(Number(customGstPercentage) > 0 ? { custom_gst_percentage: Number(customGstPercentage) } : {}),
          } : {}),
        }
      }
      const result = await generateCreditNote(invoice.id, payload)
      onSuccess(result)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to issue credit note.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex shrink-0 items-start justify-between p-6 pb-0">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Issue Credit Note</h3>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Against invoice #{invoice.invoice_number}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto p-6 pt-3 space-y-4">
          {error ? <div className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400">{error}</div> : null}

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
            Remaining creditable:{' '}
            <span className="font-bold text-slate-900 dark:text-white">
              {creditableRemaining === null ? 'Loading…' : fmtMoney(creditableRemaining)}
            </span>
          </div>

          <div>
            <label className={labelCls}>Credit Type *</label>
            <div className="grid grid-cols-2 gap-2">
              {[{ id: 'full', label: 'Full Credit' }, { id: 'partial', label: 'Partial Credit' }].map((opt) => {
                const sel = mode === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMode(opt.id)}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                      sel ? 'border-transparent text-white' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                    }`}
                    style={sel ? { backgroundColor: theme.accent } : undefined}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {mode === 'partial' ? (
            <>
              <div>
                <label className={labelCls}>Select line items to credit</label>
                <div className="space-y-2 rounded-xl border border-slate-200 p-2 dark:border-slate-800">
                  {lineItems.map((line) => {
                    const checked = line.id in selectedLines
                    return (
                      <div key={line.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-900">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleLine(line)}
                          className="h-4 w-4 shrink-0"
                          style={{ accentColor: theme.accent }}
                        />
                        <span className="flex-1 truncate text-sm text-slate-700 dark:text-slate-200">{line.description}</span>
                        <span className="shrink-0 text-xs text-slate-400">of {fmtMoney(line.line_total)}</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={!checked}
                          value={selectedLines[line.id] ?? ''}
                          onChange={(e) => setSelectedLines((prev) => ({ ...prev, [line.id]: e.target.value }))}
                          className="w-24 shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 outline-none disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-100"
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Custom Amount (optional)</label>
                  <input type="number" min="0" step="0.01" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} className={inputCls} placeholder="0.00" />
                </div>
                <div>
                  <label className={labelCls}>GST % on Custom Amount</label>
                  <input type="number" min="0" step="0.01" value={customGstPercentage} onChange={(e) => setCustomGstPercentage(e.target.value)} className={inputCls} placeholder="0" disabled={!Number(customAmount)} />
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Credits every line item on this invoice in full, up to whatever is still remaining (accounts for any credit notes already issued).
            </p>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
            This credit note total: <span className="font-bold text-slate-900 dark:text-white">{fmtMoney(runningTotal)}</span>
          </div>

          <div>
            <label className={labelCls}>Reason Category</label>
            <SearchableSelect
              value={reasonCategory}
              options={reasonCategories}
              onChange={setReasonCategory}
              placeholder="Select a reason category (optional)"
              accent={theme.accent}
              accentSoft={theme.accentSoft}
            />
          </div>
          <div>
            <label className={labelCls}>Reason *</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} className={`${inputCls} h-20`} placeholder="Why is this credit being issued?" />
          </div>
        </form>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 p-6 pt-4 dark:border-slate-800">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400">Cancel</button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || creditableRemaining === null || creditableRemaining <= 0}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: theme.accent }}
          >
            {saving ? 'Issuing...' : 'Issue Credit Note'}
          </button>
        </div>
      </div>
    </div>
  )
}
