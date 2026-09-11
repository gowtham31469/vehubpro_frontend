import { useEffect, useState } from 'react'
import { Pencil, Plus, Search, ShieldCheck, Trash2, X } from 'lucide-react'
import AdminShell from '../components/AdminShell'
import SearchableSelect from '../components/SearchableSelect'
import { useToast } from '../context/ToastContext.jsx'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { getCurrentUser } from '../utils/apiClient'
import {
  createStaffUser,
  deleteStaffUser,
  fetchRoles,
  fetchStaffUsers,
  fetchTenantPermissionCatalog,
  updateStaffUser,
} from '../utils/users'

function initials(name) {
  if (!name) return 'NA'
  const parts = name.trim().split(/\s+/)
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

function normalizeText(value) {
  if (value === null || value === undefined) return ''
  return String(value)
}

function normalizePhoneDigits(value) {
  const digits = normalizeText(value).replaceAll(/\D/g, '')
  if (digits.startsWith('91') && digits.length > 10) {
    return digits.slice(-10)
  }
  return digits.slice(0, 10)
}

const emptyForm = {
  full_name: '',
  email: '',
  phone: '',
  password: '',
  role: '',
  status: 'active',
}

const STATUS_OPTIONS = [
  { id: 'active', name: 'Active' },
  { id: 'inactive', name: 'Inactive' },
]

export default function AdminUsers() {
  const { theme } = useTenantBranding()
  const { showToast } = useToast()
  const currentUser = getCurrentUser()

  const [usersData, setUsersData] = useState({ count: 0, next: null, previous: null, results: [] })
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [searchText, setSearchText] = useState('')
  const [debouncedSearchText, setDebouncedSearchText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const [roles, setRoles] = useState([])
  const [permissionCatalog, setPermissionCatalog] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(false)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [modalErrorMessage, setModalErrorMessage] = useState('')

  const [archiveTarget, setArchiveTarget] = useState(null)
  const [isArchiving, setIsArchiving] = useState(false)

  const [permissionsTarget, setPermissionsTarget] = useState(null)
  const [selectedPermissionIds, setSelectedPermissionIds] = useState(() => new Set())
  const [permissionsSaving, setPermissionsSaving] = useState(false)

  const loadUsers = async (targetPage = page) => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const data = await fetchStaffUsers({ page: targetPage, pageSize, search: debouncedSearchText })
      setUsersData(data)
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') {
        globalThis.location.href = '/admin'
        return
      }
      setErrorMessage(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const t = globalThis.setTimeout(() => setDebouncedSearchText(searchText), 300)
    return () => globalThis.clearTimeout(t)
  }, [searchText])

  useEffect(() => {
    loadUsers(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchText])

  useEffect(() => {
    fetchRoles()
      .then((data) => setRoles(Array.isArray(data) ? data : []))
      .catch(() => {/* role dropdown just stays empty; form still usable for everything else */})
  }, [])

  const loadPermissionCatalog = async () => {
    setCatalogLoading(true)
    try {
      const data = await fetchTenantPermissionCatalog()
      setPermissionCatalog(Array.isArray(data) ? data : [])
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') {
        globalThis.location.href = '/admin'
        return
      }
      showToast('error', err.message || 'Unable to load permissions.')
    } finally {
      setCatalogLoading(false)
    }
  }

  const visibleUsers = usersData.results || []

  const openCreate = () => {
    setEditingUser(null)
    setFormData(emptyForm)
    setModalErrorMessage('')
    setIsFormOpen(true)
  }

  const openEdit = (user) => {
    setEditingUser(user)
    setFormData({
      full_name: normalizeText(user.full_name_value),
      email: normalizeText(user.email_value),
      phone: normalizePhoneDigits(user.phone_value),
      password: '',
      role: user.role || '',
      status: user.status === 'inactive' ? 'inactive' : 'active',
    })
    setModalErrorMessage('')
    setIsFormOpen(true)
  }

  const openPermissions = (user) => {
    setPermissionsTarget(user)
    setSelectedPermissionIds(new Set((user.permission_ids || []).map(String)))
    loadPermissionCatalog()
  }

  const togglePermission = (permissionId) => {
    setSelectedPermissionIds((prev) => {
      const next = new Set(prev)
      const key = String(permissionId)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleSubmoduleAll = (submodule, checked) => {
    setSelectedPermissionIds((prev) => {
      const next = new Set(prev)
      submodule.permissions.forEach((p) => {
        if (checked) next.add(String(p.id))
        else next.delete(String(p.id))
      })
      return next
    })
  }

  const toggleModuleAll = (module, checked) => {
    setSelectedPermissionIds((prev) => {
      const next = new Set(prev)
      ;(module.submodules || []).forEach((submodule) => {
        submodule.permissions.forEach((p) => {
          if (checked) next.add(String(p.id))
          else next.delete(String(p.id))
        })
      })
      return next
    })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setModalErrorMessage('')

    const trimOrEmpty = (value) => normalizeText(value).trim()
    const fullName = trimOrEmpty(formData.full_name)
    const email = trimOrEmpty(formData.email)
    const phoneDigits = normalizePhoneDigits(formData.phone)

    if (!fullName) {
      setModalErrorMessage('Full name is required.')
      setSaving(false)
      return
    }
    if (!email) {
      setModalErrorMessage('Email is required.')
      setSaving(false)
      return
    }
    if (!formData.role) {
      setModalErrorMessage('Role is required.')
      setSaving(false)
      return
    }
    if (!editingUser && !formData.password.trim()) {
      setModalErrorMessage('Password is required for a new user.')
      setSaving(false)
      return
    }

    const payload = {
      full_name: fullName,
      email,
      phone: phoneDigits ? `+91${phoneDigits}` : '',
      role: formData.role,
      status: formData.status,
    }
    if (formData.password.trim()) {
      payload.password = formData.password.trim()
    }

    try {
      if (editingUser?.id) {
        await updateStaffUser(editingUser.id, payload)
        showToast('success', 'User updated successfully.')
      } else {
        await createStaffUser(payload)
        showToast('success', 'User created successfully.')
      }
      setIsFormOpen(false)
      await loadUsers(page)
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') {
        globalThis.location.href = '/admin'
        return
      }
      setModalErrorMessage(err.message)
      showToast('error', err.message || 'Action failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleArchiveConfirm = async () => {
    if (!archiveTarget?.id) return
    setIsArchiving(true)
    try {
      await deleteStaffUser(archiveTarget.id)
      setArchiveTarget(null)
      showToast('success', 'User archived successfully.')
      await loadUsers(page)
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') {
        globalThis.location.href = '/admin'
        return
      }
      showToast('error', err.message || 'Unable to archive user.')
    } finally {
      setIsArchiving(false)
    }
  }

  const handleSavePermissions = async () => {
    if (!permissionsTarget?.id) return
    setPermissionsSaving(true)
    try {
      await updateStaffUser(permissionsTarget.id, { permissions: Array.from(selectedPermissionIds) })
      showToast('success', 'Module access updated successfully.')
      setPermissionsTarget(null)
      await loadUsers(page)
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') {
        globalThis.location.href = '/admin'
        return
      }
      showToast('error', err.message || 'Unable to update module access.')
    } finally {
      setPermissionsSaving(false)
    }
  }

  const roleOptions = roles.map((r) => ({ id: r.id, name: r.name }))

  return (
    <>
      <AdminShell activeNav="user_management">
        <div className="mx-auto max-w-[1180px] space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">User Management</h2>
              <p className="mt-1 text-slate-500 dark:text-slate-400">Manage staff accounts, roles, and module access.</p>
            </div>
            {!isFormOpen ? (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow transition-opacity hover:opacity-90"
                style={{ backgroundColor: theme.accent }}
              >
                <Plus size={18} /> Add New User
              </button>
            ) : null}
          </div>

          {isFormOpen ? (
            <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 md:p-6">
              {modalErrorMessage ? (
                <div className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {modalErrorMessage}
                </div>
              ) : null}

              <div className={`${modalErrorMessage ? 'mt-4' : ''} relative z-10 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800/60 dark:bg-slate-900/40 md:p-4`}>
                <p className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">User Information</p>
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                  <div>
                    <label htmlFor="user_full_name" className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Full Name <span className="text-rose-500">*</span></label>
                    <input
                      id="user_full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData((p) => ({ ...p, full_name: e.target.value }))}
                      placeholder="e.g. Johnathan Doe"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-700"
                    />
                  </div>
                  <div>
                    <label htmlFor="user_email" className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Email Address <span className="text-rose-500">*</span></label>
                    <input
                      id="user_email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                      placeholder="name@example.com"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-700"
                    />
                  </div>
                  <div>
                    <label htmlFor="user_phone" className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Phone Number</label>
                    <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-slate-300 dark:border-slate-800 dark:bg-slate-950/50">
                      <span className="flex items-center border-r border-slate-200 px-3 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:text-slate-400">+91</span>
                      <input
                        id="user_phone"
                        value={formData.phone}
                        maxLength={10}
                        inputMode="numeric"
                        onChange={(e) => setFormData((p) => ({ ...p, phone: normalizePhoneDigits(e.target.value) }))}
                        placeholder="Enter 10-digit number"
                        className="w-full bg-white px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:bg-transparent dark:text-slate-100"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="user_password" className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Password {!editingUser ? <span className="text-rose-500">*</span> : null}
                    </label>
                    <input
                      id="user_password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                      placeholder={editingUser ? 'Leave blank to keep current password' : 'Set an initial password'}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-700"
                    />
                  </div>
                  <div>
                    <label htmlFor="user_role" className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Role <span className="text-rose-500">*</span></label>
                    <SearchableSelect
                      id="user_role"
                      value={formData.role}
                      options={roleOptions}
                      onChange={(id) => setFormData((p) => ({ ...p, role: id }))}
                      placeholder="Select role"
                      searchPlaceholder="Search roles…"
                      accent={theme.accent}
                      accentSoft={theme.accentSoft}
                    />
                  </div>
                  <div>
                    <label htmlFor="user_status" className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Status</label>
                    <SearchableSelect
                      id="user_status"
                      value={formData.status}
                      options={STATUS_OPTIONS}
                      onChange={(id) => setFormData((p) => ({ ...p, status: id || 'active' }))}
                      placeholder="Select status"
                      searchPlaceholder="Search status…"
                      accent={theme.accent}
                      accentSoft={theme.accentSoft}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: theme.accent }}>
                  {saving ? 'Saving...' : editingUser ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                <div className="relative min-w-[250px] flex-1">
                  <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search by name, phone, or email..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-700"
                  />
                </div>
              </div>

              {errorMessage ? <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400">{errorMessage}</div> : null}

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50/50 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
                      <tr>
                        <th className="px-6 py-4">User Details</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Contact</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800/60">
                      {isLoading ? (
                        <tr><td className="px-6 py-8 text-slate-500" colSpan={5}>Loading users...</td></tr>
                      ) : visibleUsers.length === 0 ? (
                        <tr><td className="px-6 py-8 text-slate-500" colSpan={5}>No users found.</td></tr>
                      ) : (
                        visibleUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                  {initials(user.full_name_value)}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900 dark:text-white">
                                    {user.full_name_value || '-'}
                                    {String(user.id) === String(currentUser?.id) ? (
                                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">You</span>
                                    ) : null}
                                  </p>
                                  <p className="text-xs text-slate-400 dark:text-slate-500">{user.email_value || '-'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{user.role_name || '-'}</td>
                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{user.phone_value || '-'}</td>
                            <td className="px-6 py-4">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  user.status === 'active'
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                }`}
                              >
                                {user.status === 'active' ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => openPermissions(user)}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
                                  title="Module Access"
                                >
                                  <ShieldCheck size={14} /> Module Access
                                </button>
                                <button onClick={() => openEdit(user)} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white" title="Edit"><Pencil size={17} /></button>
                                <button
                                  onClick={() => setArchiveTarget(user)}
                                  disabled={String(user.id) === String(currentUser?.id)}
                                  className="rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-rose-500/10"
                                  title={String(user.id) === String(currentUser?.id) ? 'You cannot archive your own account' : 'Archive'}
                                >
                                  <Trash2 size={17} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-800/60">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Showing {visibleUsers.length} of {usersData.count} entries
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(page - 1, 1)
                        setPage(next)
                        loadUsers(next)
                      }}
                      disabled={!usersData.previous}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
                    >
                      Prev
                    </button>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white shadow-md" style={{ backgroundColor: theme.accent }}>{page}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = page + 1
                        setPage(next)
                        loadUsers(next)
                      }}
                      disabled={!usersData.next}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </AdminShell>

      {archiveTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Archive User</h3>
              <button
                type="button"
                onClick={() => setArchiveTarget(null)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                aria-label="Close archive modal"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              Are you sure you want to archive{' '}
              <span className="font-semibold text-slate-900 dark:text-white">{archiveTarget.full_name_value || 'this user'}</span>? They will lose access immediately.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setArchiveTarget(null)}
                disabled={isArchiving}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-60 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchiveConfirm}
                disabled={isArchiving}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 transition-opacity hover:opacity-90"
              >
                {isArchiving ? 'Archiving...' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {permissionsTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-6 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Manage Access - {permissionsTarget.full_name_value || 'User'}
              </h3>
              <button
                type="button"
                onClick={() => setPermissionsTarget(null)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                aria-label="Close module access modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {catalogLoading ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading permissions…</p>
              ) : permissionCatalog.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No modules are enabled for this tenant.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {permissionCatalog.map((module) => {
                    const submodules = module.submodules || []
                    const moduleAllChecked =
                      submodules.length > 0 &&
                      submodules.every(
                        (s) => s.permissions.length > 0 && s.permissions.every((p) => selectedPermissionIds.has(String(p.id)))
                      )
                    return (
                      <div key={module.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800/60 dark:bg-slate-900/40">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-base font-bold text-slate-900 dark:text-white">{module.name}</p>
                          <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={moduleAllChecked}
                              onChange={(e) => toggleModuleAll(module, e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 dark:border-slate-600"
                              style={{ accentColor: theme.accent }}
                            />
                            All
                          </label>
                        </div>
                        <div>
                          {submodules.map((submodule, idx) => {
                            const allChecked =
                              submodule.permissions.length > 0 &&
                              submodule.permissions.every((p) => selectedPermissionIds.has(String(p.id)))
                            return (
                              <div
                                key={submodule.id}
                                className={`py-2.5 ${idx > 0 ? 'border-t border-slate-200 dark:border-slate-800/60' : ''}`}
                              >
                                <label className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                                  <input
                                    type="checkbox"
                                    checked={allChecked}
                                    disabled={submodule.permissions.length === 0}
                                    onChange={(e) => toggleSubmoduleAll(submodule, e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-600"
                                    style={{ accentColor: theme.accent }}
                                  />
                                  {submodule.name}
                                </label>
                                {submodule.permissions.length === 0 ? (
                                  <p className="ml-6 mt-1 text-xs text-slate-400 dark:text-slate-500">No permissions defined.</p>
                                ) : (
                                  <div className="ml-6 mt-1.5 flex flex-wrap gap-1.5">
                                    {submodule.permissions.map((p) => {
                                      const isSelected = selectedPermissionIds.has(String(p.id))
                                      return (
                                        <button
                                          key={p.id}
                                          type="button"
                                          onClick={() => togglePermission(p.id)}
                                          className="select-none rounded-md border px-2 py-0.5 text-xs font-medium transition"
                                          style={
                                            isSelected
                                              ? { borderColor: theme.accent, backgroundColor: theme.accent, color: '#fff' }
                                              : { borderColor: theme.accentSoft, backgroundColor: 'transparent', color: theme.accent }
                                          }
                                        >
                                          {p.permission_name}
                                        </button>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPermissionsTarget(null)}
                disabled={permissionsSaving}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-60 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={permissionsSaving || catalogLoading}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 transition-opacity hover:opacity-90"
                style={{ backgroundColor: theme.accent }}
              >
                {permissionsSaving ? 'Saving...' : 'Save Access'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
