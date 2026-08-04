import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Upload, X } from 'lucide-react'
import { useToast } from '../context/ToastContext.jsx'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { fetchMyInvoiceSettings, updateMyInvoiceSettings } from '../utils/invoiceSettings'

const inp = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-700'
const label = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400'

const emptyForm = {
  account_holder_name: '', account_number: '', account_type: '',
  ifsc_code: '', bank_name: '', branch_name: '', upi_id: '',
  terms_and_conditions: '',
  currency_symbol: '₹', advance_payment_percentage: '100', estimate_charge_percentage: '3',
  replaced_parts_retention_days: '2', service_warranty_days: '30',
}

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'savings', label: 'Savings' },
  { value: 'current', label: 'Current' },
]

function Field({ children, hint }) {
  return (
    <div>
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  )
}

function Dropdown({ open, setOpen, dropdownRef, displayValue, placeholder, children }) {
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-9 text-left text-sm text-slate-800 outline-none transition hover:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:hover:border-slate-700"
      >
        {displayValue || <span className="text-slate-400 dark:text-slate-600">{placeholder}</span>}
      </button>
      <ChevronDown size={16} className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition ${open ? 'rotate-180' : ''}`} />
      {open ? (
        <div className="absolute left-0 right-0 z-20 mt-2 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {children}
        </div>
      ) : null}
    </div>
  )
}

function DropdownItem({ selected, onClick, theme, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${selected ? 'font-semibold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
      style={selected ? { backgroundColor: theme.accentSoft, color: theme.accent } : undefined}
    >
      {selected ? <Check size={14} /> : <span className="w-[14px]" />}
      {children}
    </button>
  )
}

export default function InvoiceSettingsPanel() {
  const { theme } = useTenantBranding()
  const { showToast } = useToast()
  const [settings, setSettings] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [qrFile, setQrFile] = useState(null)
  const fileInputRef = useRef(null)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const [accountTypeOpen, setAccountTypeOpen] = useState(false)
  const accountTypeRef = useRef(null)

  useEffect(() => {
    if (!accountTypeOpen) return undefined
    const handle = (e) => {
      if (accountTypeRef.current && !accountTypeRef.current.contains(e.target)) setAccountTypeOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [accountTypeOpen])

  useEffect(() => {
    fetchMyInvoiceSettings()
      .then((data) => {
        setSettings(data)
        setForm({
          account_holder_name: data?.account_holder_name ?? '',
          account_number: data?.account_number_value ?? '',
          account_type: data?.account_type ?? '',
          ifsc_code: data?.ifsc_code ?? '',
          bank_name: data?.bank_name ?? '',
          branch_name: data?.branch_name ?? '',
          upi_id: data?.upi_id ?? '',
          terms_and_conditions: data?.terms_and_conditions ?? '',
          currency_symbol: data?.currency_symbol ?? '₹',
          advance_payment_percentage: data?.advance_payment_percentage ?? '100',
          estimate_charge_percentage: data?.estimate_charge_percentage ?? '3',
          replaced_parts_retention_days: data?.replaced_parts_retention_days ?? '2',
          service_warranty_days: data?.service_warranty_days ?? '30',
        })
      })
      .catch((e) => showToast('error', e.message || 'Failed to load invoice settings.'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ''))
      if (qrFile) fd.append('qr_code_file', qrFile)
      const updated = await updateMyInvoiceSettings(fd)
      setSettings(updated)
      setQrFile(null)
      showToast('success', 'Invoice settings updated.')
    } catch (e) {
      showToast('error', e.message || 'Failed to save invoice settings.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/50" />
        ))}
      </div>
    )
  }

  const qrPreview = qrFile ? URL.createObjectURL(qrFile) : settings?.qr_code_url || null

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Bank Account Details</h3>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Printed on job card / invoice PDFs for customer bank transfers.</p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <span className={label}>Account Holder Name</span>
            <input className={inp} value={form.account_holder_name} onChange={set('account_holder_name')} placeholder="Cheziyan Cars" />
          </Field>
          <Field>
            <span className={label}>Account Number</span>
            <input className={`${inp} font-mono`} value={form.account_number} onChange={set('account_number')} placeholder="05853 11111 11111" />
          </Field>
          <Field>
            <span className={label}>IFSC Code</span>
            <input
              className={`${inp} font-mono uppercase`}
              value={form.ifsc_code}
              onChange={(e) => setForm((f) => ({ ...f, ifsc_code: e.target.value.toUpperCase() }))}
              placeholder="TMBL0000058"
            />
          </Field>
          <Field>
            <span className={label}>Account Type</span>
            <Dropdown
              open={accountTypeOpen}
              setOpen={setAccountTypeOpen}
              dropdownRef={accountTypeRef}
              placeholder="Select type"
              displayValue={ACCOUNT_TYPE_OPTIONS.find((o) => o.value === form.account_type)?.label}
            >
              <DropdownItem
                theme={theme}
                selected={!form.account_type}
                onClick={() => {
                  setForm((f) => ({ ...f, account_type: '' }))
                  setAccountTypeOpen(false)
                }}
              >
                Select type
              </DropdownItem>
              {ACCOUNT_TYPE_OPTIONS.map((opt) => (
                <DropdownItem
                  key={opt.value}
                  theme={theme}
                  selected={form.account_type === opt.value}
                  onClick={() => {
                    setForm((f) => ({ ...f, account_type: opt.value }))
                    setAccountTypeOpen(false)
                  }}
                >
                  {opt.label}
                </DropdownItem>
              ))}
            </Dropdown>
          </Field>
          <Field>
            <span className={label}>Bank Name</span>
            <input className={inp} value={form.bank_name} onChange={set('bank_name')} placeholder="Tamilnadu Mercantile Bank" />
          </Field>
          <Field>
            <span className={label}>Branch</span>
            <input className={inp} value={form.branch_name} onChange={set('branch_name')} placeholder="Podanur" />
          </Field>
          <Field>
            <span className={label}>UPI ID</span>
            <input className={inp} value={form.upi_id} onChange={set('upi_id')} placeholder="cheziyancars058@tmb" />
          </Field>

          <div>
            <span className={label}>UPI QR Code</span>
            <input ref={fileInputRef} type="file" accept="image/*" className="sr-only" onChange={(e) => setQrFile(e.target.files?.[0] ?? null)} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`group relative flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed p-3 text-center transition ${
                qrPreview ? 'border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/50 dark:hover:border-slate-700'
              }`}
            >
              {qrPreview ? (
                <div className="relative">
                  <img src={qrPreview} alt="QR" className="mx-auto max-h-14 max-w-full rounded object-contain" />
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); setQrFile(null) }}
                    className="absolute -right-2 -top-2 rounded-full bg-rose-500 p-0.5 text-white"
                  >
                    <X size={10} />
                  </span>
                </div>
              ) : (
                <>
                  <Upload size={16} className="text-slate-400" />
                  <span className="text-xs text-slate-400">Click to upload</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Terms & Conditions Variables</h3>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Used to fill in placeholders inside your terms & conditions text below.</p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field>
            <span className={label}>Currency Symbol</span>
            <input className={inp} value={form.currency_symbol} onChange={set('currency_symbol')} placeholder="₹" maxLength={5} />
          </Field>
          <Field>
            <span className={label}>Advance Payment (%)</span>
            <input type="number" min="0" max="100" step="0.01" className={inp} value={form.advance_payment_percentage} onChange={set('advance_payment_percentage')} placeholder="100" />
          </Field>
          <Field>
            <span className={label}>Estimate Charge (%)</span>
            <input type="number" min="0" max="100" step="0.01" className={inp} value={form.estimate_charge_percentage} onChange={set('estimate_charge_percentage')} placeholder="3" />
          </Field>
          <Field>
            <span className={label}>Replaced Parts Retention (days)</span>
            <input type="number" min="0" className={inp} value={form.replaced_parts_retention_days} onChange={set('replaced_parts_retention_days')} placeholder="2" />
          </Field>
          <Field>
            <span className={label}>Service Warranty (days)</span>
            <input type="number" min="0" className={inp} value={form.service_warranty_days} onChange={set('service_warranty_days')} placeholder="30" />
          </Field>
        </div>

        <div className="mt-5">
          <span className={label}>Terms & Conditions</span>
          <textarea
            rows={10}
            className={`${inp} font-mono text-xs`}
            value={form.terms_and_conditions}
            onChange={set('terms_and_conditions')}
            placeholder={'Pickup, drop-off, and test drives are undertaken at the customer’s own risk. {{tenant_name}} will exercise reasonable care…\n\nAn advance payment of {{advance_payment_percentage}}% of the quoted spare parts value must be paid before work commences.'}
          />
          <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            Separate each clause with a blank line — each is auto-numbered on the PDF. Use {'{{tenant_name}}'}, {'{{advance_payment_percentage}}'}, {'{{estimate_charge_percentage}}'}, {'{{replaced_parts_retention_days}}'}, {'{{service_warranty_days}}'}, {'{{currency_symbol}}'} — they'll be substituted with the values above.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50"
          style={{ backgroundColor: theme.accent }}
        >
          {saving ? 'Saving…' : 'Save Invoice Settings'}
        </button>
      </div>
    </div>
  )
}
