import { useEffect, useState } from 'react'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { fetchStaffUsers } from '../utils/users'
import SearchableSelect from './SearchableSelect'

/**
 * Staff-user picker for FK fields like VehicleSale.salesperson /
 * VehicleDelivery.delivered_by — wraps SearchableSelect with the tenant's
 * staff list.
 */
export default function StaffPicker({ value, onChange, label, required = false, disabled = false }) {
  const { theme } = useTenantBranding()
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchStaffUsers({ pageSize: 'all' })
      .then((data) => {
        if (cancelled) return
        const rows = Array.isArray(data) ? data : data?.results || []
        setStaff(rows)
      })
      .catch(() => { if (!cancelled) setStaff([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const options = staff.map((u) => ({ id: u.id, name: u.full_name_value || u.email_value || 'Staff' }))

  return (
    <div>
      {label ? (
        <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
          {label}{required ? ' *' : ''}
        </label>
      ) : null}
      <SearchableSelect
        value={value}
        options={options}
        onChange={onChange}
        placeholder="Select staff member"
        searchPlaceholder="Search staff..."
        disabled={disabled}
        loading={loading}
        loadingLabel="Loading staff..."
        accent={theme.accent}
        accentSoft={theme.accentSoft}
      />
    </div>
  )
}
