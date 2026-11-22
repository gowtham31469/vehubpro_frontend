import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import AdminShell from '../components/AdminShell'
import SearchableSelect from '../components/SearchableSelect'
import { useToast } from '../context/ToastContext.jsx'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { createVendor, fetchVendorCategories, getVendor, updateVendor } from '../utils/vendors'

function emptyForm() {
  return {
    name: '',
    category: 'Other',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    pan: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_ifsc: '',
    bank_name: '',
    payment_terms_days: 0,
    notes: '',
  }
}

function vendorToForm(v) {
  return {
    name: v.name || '',
    category: v.category || 'Other',
    contact_person: v.contact_person || '',
    phone: v.phone || '',
    email: v.email || '',
    address: v.address || '',
    gstin: v.gstin || '',
    pan: v.pan || '',
    bank_account_name: v.bank_account_name || '',
    bank_account_number: v.bank_account_number || '',
    bank_ifsc: v.bank_ifsc || '',
    bank_name: v.bank_name || '',
    payment_terms_days: v.payment_terms_days ?? 0,
    notes: v.notes || '',
  }
}

const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-700'
const labelCls = 'mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400'

export default function AdminVendorForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { theme } = useTenantBranding()
  const { showToast } = useToast()

  const [form, setForm] = useState(emptyForm())
  const [categories, setCategories] = useState([])
  const [saving, setSaving] = useState(false)
  const [loadingVendor, setLoadingVendor] = useState(isEdit)
  const [formError, setFormError] = useState('')

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  useEffect(() => {
    fetchVendorCategories({ isActive: true })
      .then((rows) => setCategories(rows.map((c) => ({ id: c.name, name: c.name }))))
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    if (!isEdit) return
    let cancelled = false
    setLoadingVendor(true)
    getVendor(id)
      .then((v) => { if (!cancelled) { setForm(vendorToForm(v)); setLoadingVendor(false) } })
      .catch((e) => {
        if (cancelled) return
        if (e.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
        showToast('error', e.message || 'Failed to load vendor.')
        setLoadingVendor(false)
      })
    return () => { cancelled = true }
  }, [id, isEdit])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!form.name.trim()) {
      setFormError('Vendor name is required.')
      return
    }
    setSaving(true)
    try {
      const payload = { ...form, payment_terms_days: Number(form.payment_terms_days) || 0 }
      if (isEdit) {
        await updateVendor(id, payload)
        showToast('success', 'Vendor updated.')
      } else {
        await createVendor(payload)
        showToast('success', 'Vendor created.')
      }
      navigate('/admin/vendors')
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      setFormError(err.message || 'Failed to save vendor.')
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
            onClick={() => navigate('/admin/vendors')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
            aria-label="Back"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{isEdit ? 'Edit Vendor' : 'Add Vendor'}</h2>
            <p className="mt-1 text-slate-500 dark:text-slate-400">{isEdit ? 'Update this vendor\'s details.' : 'Add a new vendor/supplier to your master list.'}</p>
          </div>
        </div>

        {loadingVendor ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-10 text-sm text-slate-500 dark:text-slate-400 shadow-sm">Loading vendor…</div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40 md:p-6">
            {formError ? (
              <div className="mb-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 text-sm text-rose-700 dark:text-rose-400">{formError}</div>
            ) : null}

            {/* Section: Basic Details */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40 md:p-4">
              <p className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">Basic Details</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Vendor Name <span className="text-rose-500">*</span></label>
                  <input value={form.name} onChange={set('name')} className={inputCls} placeholder="e.g. Acme Spares" />
                </div>
                <div>
                  <label className={labelCls}>Category</label>
                  <SearchableSelect
                    allowClear={false}
                    value={form.category}
                    options={categories}
                    onChange={(id_) => setForm((f) => ({ ...f, category: id_ }))}
                    accent={theme.accent}
                    accentSoft={theme.accentSoft}
                  />
                </div>
                <div>
                  <label className={labelCls}>Payment Terms (days)</label>
                  <input type="number" min="0" value={form.payment_terms_days} onChange={set('payment_terms_days')} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Contact Person</label>
                  <input value={form.contact_person} onChange={set('contact_person')} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input value={form.phone} onChange={set('phone')} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" value={form.email} onChange={set('email')} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>GSTIN</label>
                  <input value={form.gstin} onChange={set('gstin')} className={inputCls} maxLength={15} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Address</label>
                  <textarea value={form.address} onChange={set('address')} className={`${inputCls} h-16`} />
                </div>
                <div>
                  <label className={labelCls}>PAN</label>
                  <input value={form.pan} onChange={set('pan')} className={inputCls} maxLength={10} />
                </div>
              </div>
            </div>

            {/* Section: Bank Details */}
            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40 md:p-4">
              <p className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">Bank Details</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Bank Account Name</label>
                  <input value={form.bank_account_name} onChange={set('bank_account_name')} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Bank Name</label>
                  <input value={form.bank_name} onChange={set('bank_name')} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Account Number</label>
                  <input value={form.bank_account_number} onChange={set('bank_account_number')} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>IFSC</label>
                  <input value={form.bank_ifsc} onChange={set('bank_ifsc')} className={inputCls} maxLength={11} />
                </div>
              </div>
            </div>

            {/* Section: Notes */}
            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40 md:p-4">
              <p className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">Notes</p>
              <textarea value={form.notes} onChange={set('notes')} className={`${inputCls} h-24`} placeholder="Any additional notes about this vendor…" />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => navigate('/admin/vendors')}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: theme.accent }}
              >
                {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Vendor'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminShell>
  )
}
