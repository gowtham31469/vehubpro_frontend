import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import AdminShell from '../components/AdminShell'
import SearchableSelect from '../components/SearchableSelect'
import { useToast } from '../context/ToastContext.jsx'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { createVendorBill, fetchVendors } from '../utils/vendors'

const GST_PERCENTAGE_OPTIONS = ['0', '5', '12', '18', '28'].map((p) => ({ id: p, name: `${p}%` }))
const TDS_PERCENTAGE_OPTIONS = ['0', '1', '2', '5', '10'].map((p) => ({ id: p, name: `${p}%` }))

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100'
const labelCls = 'mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400'

export default function AdminVendorBillForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { theme } = useTenantBranding()
  const { showToast } = useToast()

  const [vendors, setVendors] = useState([])
  const [form, setForm] = useState({
    vendor_id: searchParams.get('vendor_id') || '',
    bill_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    vendor_bill_reference: '',
    description: '',
    subtotal: '',
    gst_percentage: '18',
    is_interstate: false,
    tds_percentage: '0',
  })
  const [attachment, setAttachment] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  useEffect(() => {
    fetchVendors({ pageSize: 'all', archived: false }).then((data) => setVendors(data.results || [])).catch(() => {})
  }, [])

  const breakdown = useMemo(() => {
    const subtotal = Number(form.subtotal) || 0
    const gstPct = Number(form.gst_percentage) || 0
    const tdsPct = Number(form.tds_percentage) || 0
    const gstAmount = Math.round(subtotal * gstPct) / 100
    const cgst = form.is_interstate ? 0 : Math.round(gstAmount / 2 * 100) / 100
    const sgst = form.is_interstate ? 0 : gstAmount - cgst
    const igst = form.is_interstate ? gstAmount : 0
    const total = Math.round(subtotal + gstAmount)
    const tdsAmount = Math.round(subtotal * tdsPct) / 100
    const netPayable = total - tdsAmount
    return { cgst, sgst, igst, total, tdsAmount, netPayable }
  }, [form.subtotal, form.gst_percentage, form.is_interstate, form.tds_percentage])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!form.vendor_id) { setFormError('Select a vendor.'); return }
    if (!form.subtotal || Number(form.subtotal) <= 0) { setFormError('Enter a valid bill amount.'); return }

    setSaving(true)
    try {
      const payload = { ...form, attachment: attachment || undefined }
      const result = await createVendorBill(payload)
      showToast('success', `Bill ${result.bill_number} created.`)
      navigate(`/admin/vendor-bills/${result.id}`)
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      setFormError(err.message || 'Failed to create bill.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminShell activeNav="vendor">
      <div className="mx-auto max-w-[1000px] space-y-5">

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/vendor-bills')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
            aria-label="Back"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">New Vendor Bill</h2>
            <p className="mt-1 text-slate-500 dark:text-slate-400">Record a bill a vendor has issued to you.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40 md:p-6">
          {formError ? (
            <div className="mb-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 text-sm text-rose-700 dark:text-rose-400">{formError}</div>
          ) : null}

          <div className="rounded-xl border border-slate-200 bg-white p-3 backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40 md:p-4">
            <p className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">Bill Details</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls}>Vendor <span className="text-rose-500">*</span></label>
                <SearchableSelect
                  value={form.vendor_id}
                  options={vendors}
                  onChange={(id) => setForm((f) => ({ ...f, vendor_id: id }))}
                  placeholder="Select a vendor…"
                  searchPlaceholder="Search vendors…"
                  accent={theme.accent}
                  accentSoft={theme.accentSoft}
                />
              </div>
              <div>
                <label className={labelCls}>Bill Date <span className="text-rose-500">*</span></label>
                <input type="date" value={form.bill_date} onChange={set('bill_date')} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Due Date</label>
                <input type="date" value={form.due_date} onChange={set('due_date')} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Vendor's Bill Reference</label>
                <input value={form.vendor_bill_reference} onChange={set('vendor_bill_reference')} className={inputCls} placeholder="e.g. the number printed on their invoice" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Description</label>
                <textarea value={form.description} onChange={set('description')} className={`${inputCls} h-16`} />
              </div>

              <div>
                <label className={labelCls}>Taxable Amount <span className="text-rose-500">*</span></label>
                <input type="number" min="0" step="0.01" value={form.subtotal} onChange={set('subtotal')} className={inputCls} placeholder="0.00" />
              </div>
              <div>
                <label className={labelCls}>GST %</label>
                <SearchableSelect
                  allowClear={false}
                  value={form.gst_percentage}
                  options={GST_PERCENTAGE_OPTIONS}
                  onChange={(id) => setForm((f) => ({ ...f, gst_percentage: id }))}
                  accent={theme.accent}
                  accentSoft={theme.accentSoft}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" checked={form.is_interstate} onChange={(e) => setForm((f) => ({ ...f, is_interstate: e.target.checked }))} style={{ accentColor: theme.accent }} />
                <label className="text-sm text-slate-600 dark:text-slate-300">Interstate purchase (IGST)</label>
              </div>
              <div>
                <label className={labelCls}>TDS %</label>
                <SearchableSelect
                  allowClear={false}
                  value={form.tds_percentage}
                  options={TDS_PERCENTAGE_OPTIONS}
                  onChange={(id) => setForm((f) => ({ ...f, tds_percentage: id }))}
                  accent={theme.accent}
                  accentSoft={theme.accentSoft}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelCls}>Attachment (vendor's bill scan/photo)</label>
                <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setAttachment(e.target.files?.[0] || null)} className={inputCls} />
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {!form.is_interstate ? (
                <>
                  <span>CGST: {fmtMoney(breakdown.cgst)}</span>
                  <span>SGST: {fmtMoney(breakdown.sgst)}</span>
                </>
              ) : <span>IGST: {fmtMoney(breakdown.igst)}</span>}
              <span className="font-semibold text-slate-900 dark:text-white">Total: {fmtMoney(breakdown.total)}</span>
              <span>TDS: -{fmtMoney(breakdown.tdsAmount)}</span>
              <span className="font-bold" style={{ color: theme.accent }}>Net Payable: {fmtMoney(breakdown.netPayable)}</span>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => navigate('/admin/vendor-bills')} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: theme.accent }}>
              {saving ? 'Creating…' : 'Create Bill'}
            </button>
          </div>
        </form>
      </div>
    </AdminShell>
  )
}
