import { useEffect, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { fetchCustomers } from '../utils/customers'
import AddCustomerDrawer from './AddCustomerDrawer'
import SearchableSelect from './SearchableSelect'

/**
 * Customer picker used across the dealer-sales modals (buyer/seller/owner
 * selection) — wraps SearchableSelect with the full customer list, plus an
 * "Add new customer" shortcut that opens the existing AddCustomerDrawer and
 * auto-selects the newly created customer.
 */
export default function CustomerPicker({ value, onChange, label, required = false, disabled = false }) {
  const { theme } = useTenantBranding()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchCustomers({ pageSize: 'all' })
      .then((data) => {
        if (cancelled) return
        const rows = Array.isArray(data) ? data : data?.results || []
        setCustomers(rows)
      })
      .catch(() => { if (!cancelled) setCustomers([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const options = customers.map((c) => ({ id: c.id, name: `${c.full_name} · ${c.phone}` }))

  return (
    <div>
      {label ? (
        <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
          {label}{required ? ' *' : ''}
        </label>
      ) : null}
      <div className="flex gap-2">
        <div className="flex-1">
          <SearchableSelect
            value={value}
            options={options}
            onChange={onChange}
            placeholder="Select customer"
            searchPlaceholder="Search customers..."
            disabled={disabled}
            loading={loading}
            loadingLabel="Loading customers..."
            accent={theme.accent}
            accentSoft={theme.accentSoft}
          />
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          title="Add new customer"
          className="shrink-0 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          style={{ color: theme.accent }}
        >
          <UserPlus size={16} />
        </button>
      </div>

      <AddCustomerDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCustomerCreated={(newCustomer) => {
          setCustomers((prev) => [newCustomer, ...prev])
          onChange(String(newCustomer.id))
        }}
      />
    </div>
  )
}
