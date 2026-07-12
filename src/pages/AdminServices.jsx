import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, ImagePlus, Pencil, Plus, Search, Trash2, Upload, Wrench, X } from 'lucide-react'
import AdminShell from '../components/AdminShell'
import { useToast } from '../context/ToastContext.jsx'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { fetchVehicleTypes } from '../utils/vehicles'
import {
  createServiceCategory,
  createServiceItem,
  deleteServiceCategory,
  deleteServiceItem,
  deleteServiceItemImage,
  fetchServiceCategories,
  fetchServiceItems,
  updateServiceCategory,
  updateServiceItem,
  uploadServiceItemImage,
} from '../utils/services'

const emptyCategory = { name: '', applicable_vehicle_types: [], is_active: true }
const emptyItem = { category: '', name: '', description: '', base_price: '', hsn_code: '', gst_percentage: '', applicable_vehicle_types: [], is_active: true }

export default function AdminServices() {
  const { theme } = useTenantBranding()
  const [tab, setTab] = useState('categories')
  const [vehicleTypes, setVehicleTypes] = useState([])
  const { showToast } = useToast()

  useEffect(() => {
    fetchVehicleTypes()
      .then((data) => setVehicleTypes(Array.isArray(data) ? data : []))
      .catch(() => setVehicleTypes([]))
  }, [])

  /* ------------------------------------------------------------------ */
  /* Categories                                                          */
  /* ------------------------------------------------------------------ */
  const [catData, setCatData] = useState({ count: 0, next: null, previous: null, results: [] })
  const [catPage, setCatPage] = useState(1)
  const [catSearch, setCatSearch] = useState('')
  const [catLoading, setCatLoading] = useState(true)
  const [catError, setCatError] = useState('')
  const [catModal, setCatModal] = useState(null)
  const [catModalError, setCatModalError] = useState('')
  const [catForm, setCatForm] = useState(emptyCategory)
  const [catSaving, setCatSaving] = useState(false)
  const [catDelete, setCatDelete] = useState(null)
  const [catAll, setCatAll] = useState([])

  const [isVtCatDropdownOpen, setIsVtCatDropdownOpen] = useState(false)
  const vtCatDropdownRef = useRef(null)
  const categoryPreserveRef = useRef({ sort_order: 0, icon_code: null })

  useEffect(() => {
    if (!isVtCatDropdownOpen) return undefined
    const handlePointerDown = (e) => {
      if (vtCatDropdownRef.current && !vtCatDropdownRef.current.contains(e.target)) setIsVtCatDropdownOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isVtCatDropdownOpen])

  const loadCategories = useCallback(async (page = 1) => {
    setCatLoading(true)
    setCatError('')
    try {
      const data = await fetchServiceCategories({ page, pageSize: 10 })
      setCatData(data)
      setCatPage(page)
    } catch (e) {
      if (e.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      setCatError(e.message)
    } finally {
      setCatLoading(false)
    }
  }, [])

  const loadAllCategories = useCallback(async () => {
    try {
      const data = await fetchServiceCategories({ page: 1, pageSize: 200 })
      setCatAll(data.results || [])
    } catch {
      setCatAll([])
    }
  }, [])

  useEffect(() => { loadCategories(1) }, [loadCategories])

  useEffect(() => {
    if (tab === 'items') loadAllCategories()
  }, [tab, loadAllCategories])

  const filteredCategories = useMemo(() => {
    const q = catSearch.trim().toLowerCase()
    const rows = catData.results || []
    if (!q) return rows
    return rows.filter((c) => c.name?.toLowerCase().includes(q))
  }, [catData.results, catSearch])

  const openCatCreate = () => {
    setCatModalError('')
    categoryPreserveRef.current = { sort_order: 0, icon_code: null }
    setCatForm({ ...emptyCategory })
    setIsVtCatDropdownOpen(false)
    setCatModal('create')
  }
  const openCatEdit = (c) => {
    setCatModalError('')
    categoryPreserveRef.current = { sort_order: c.sort_order ?? 0, icon_code: c.icon_code ?? null }
    setCatForm({
      name: c.name || '',
      applicable_vehicle_types: c.applicable_vehicle_types || [],
      is_active: Boolean(c.is_active),
    })
    setIsVtCatDropdownOpen(false)
    setCatModal({ type: 'edit', id: c.id })
  }
  const closeCatModal = () => { setCatModalError(''); setIsVtCatDropdownOpen(false); setCatModal(null) }

  const saveCategory = async (e) => {
    e.preventDefault()
    setCatModalError('')
    const name = catForm.name.trim()
    if (!name) { setCatModalError('Name is required.'); return }
    setCatSaving(true)
    try {
      const payload = {
        name,
        sort_order: catModal === 'create' ? 0 : categoryPreserveRef.current.sort_order,
        applicable_vehicle_types: catForm.applicable_vehicle_types,
        is_active: catForm.is_active,
        icon_code: categoryPreserveRef.current.icon_code || null,
      }
      if (catModal === 'create') {
        await createServiceCategory(payload)
        showToast('success', 'Category created.')
      } else if (catModal?.type === 'edit') {
        await updateServiceCategory(catModal.id, payload)
        showToast('success', 'Category updated.')
      }
      closeCatModal()
      await loadCategories(catPage)
      await loadAllCategories()
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      setCatModalError(err.message || 'Save failed.')
    } finally {
      setCatSaving(false)
    }
  }

  const confirmDeleteCategory = async () => {
    if (!catDelete?.id) return
    try {
      await deleteServiceCategory(catDelete.id)
      showToast('success', 'Category deleted.')
      setCatDelete(null)
      await loadCategories(catPage)
      await loadAllCategories()
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      showToast('error', err.message || 'Delete failed.')
    }
  }

  const toggleVtCat = (code) => {
    setCatForm((p) => {
      const list = p.applicable_vehicle_types || []
      return { ...p, applicable_vehicle_types: list.includes(code) ? list.filter((c) => c !== code) : [...list, code] }
    })
  }

  /* ------------------------------------------------------------------ */
  /* Items                                                               */
  /* ------------------------------------------------------------------ */
  const [itemData, setItemData] = useState({ count: 0, next: null, previous: null, results: [] })
  const [itemPage, setItemPage] = useState(1)
  const [itemSearch, setItemSearch] = useState('')
  const [itemCatFilter, setItemCatFilter] = useState('')
  const [itemLoading, setItemLoading] = useState(true)
  const [itemError, setItemError] = useState('')
  const [itemModal, setItemModal] = useState(null)
  const [itemModalError, setItemModalError] = useState('')
  const [itemForm, setItemForm] = useState(emptyItem)
  const [itemSaving, setItemSaving] = useState(false)
  const [itemDelete, setItemDelete] = useState(null)
  const [itemImageFile, setItemImageFile] = useState(null)
  const [itemImagePreview, setItemImagePreview] = useState(null)
  const [itemImageCurrent, setItemImageCurrent] = useState(null)
  const [itemImageRemoving, setItemImageRemoving] = useState(false)
  const [itemImageUploading, setItemImageUploading] = useState(false)
  const imageInputRef = useRef(null)

  const [isCatFilterDropdownOpen, setIsCatFilterDropdownOpen] = useState(false)
  const [isCatModalDropdownOpen, setIsCatModalDropdownOpen] = useState(false)
  const [isVtItemDropdownOpen, setIsVtItemDropdownOpen] = useState(false)
  const catFilterDropdownRef = useRef(null)
  const catModalDropdownRef = useRef(null)
  const vtItemDropdownRef = useRef(null)

  const sortedCategories = useMemo(() => {
    const rows = catAll || []
    return [...rows].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }))
  }, [catAll])

  const selectedFilterCat = useMemo(
    () => catAll.find((c) => String(c.id) === String(itemCatFilter)),
    [catAll, itemCatFilter],
  )

  const selectedModalCat = useMemo(
    () => catAll.find((c) => String(c.id) === String(itemForm.category)),
    [catAll, itemForm.category],
  )

  useEffect(() => {
    if (!isCatFilterDropdownOpen && !isCatModalDropdownOpen && !isVtItemDropdownOpen) return undefined
    const handlePointerDown = (event) => {
      if (catFilterDropdownRef.current && !catFilterDropdownRef.current.contains(event.target)) setIsCatFilterDropdownOpen(false)
      if (catModalDropdownRef.current && !catModalDropdownRef.current.contains(event.target)) setIsCatModalDropdownOpen(false)
      if (vtItemDropdownRef.current && !vtItemDropdownRef.current.contains(event.target)) setIsVtItemDropdownOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isCatFilterDropdownOpen, isCatModalDropdownOpen, isVtItemDropdownOpen])

  const loadItems = useCallback(
    async (page = 1) => {
      setItemLoading(true)
      setItemError('')
      try {
        const data = await fetchServiceItems({ page, pageSize: 10, categoryId: itemCatFilter || undefined })
        setItemData(data)
        setItemPage(page)
      } catch (e) {
        if (e.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
        setItemError(e.message)
      } finally {
        setItemLoading(false)
      }
    },
    [itemCatFilter],
  )

  useEffect(() => {
    if (tab !== 'items') return
    loadItems(1)
  }, [tab, itemCatFilter, loadItems])

  const filteredItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase()
    const rows = itemData.results || []
    if (!q) return rows
    return rows.filter((i) => i.name?.toLowerCase().includes(q) || i.category_name?.toLowerCase().includes(q))
  }, [itemData.results, itemSearch])

  const closeAllItemDropdowns = () => {
    setIsCatFilterDropdownOpen(false)
    setIsCatModalDropdownOpen(false)
    setIsVtItemDropdownOpen(false)
  }

  const openItemCreate = async () => {
    setItemModalError('')
    closeAllItemDropdowns()
    let list = catAll
    if (!list.length) {
      try {
        const data = await fetchServiceCategories({ page: 1, pageSize: 200 })
        list = data.results || []
        setCatAll(list)
      } catch { list = [] }
    }
    setItemForm({ ...emptyItem })
    setItemImageFile(null)
    setItemImagePreview(null)
    setItemImageCurrent(null)
    setItemImageRemoving(false)
    setItemModal('create')
  }

  const openItemEdit = (item) => {
    setItemModalError('')
    closeAllItemDropdowns()
    setItemForm({
      category: String(item.category || ''),
      name: item.name || '',
      description: item.description || '',
      base_price: item.base_price ?? '',
      hsn_code: item.hsn_code || '',
      gst_percentage: item.gst_percentage ?? '',
      applicable_vehicle_types: item.applicable_vehicle_types || [],
      is_active: Boolean(item.is_active),
    })
    setItemImageFile(null)
    setItemImagePreview(null)
    setItemImageCurrent(item.image_url || null)
    setItemImageRemoving(false)
    setItemModal({ type: 'edit', id: item.id })
  }

  const closeItemModal = useCallback(() => {
    setItemModalError('')
    closeAllItemDropdowns()
    setItemModal(null)
    setItemImageFile(null)
    if (itemImagePreview) URL.revokeObjectURL(itemImagePreview)
    setItemImagePreview(null)
    setItemImageCurrent(null)
    setItemImageRemoving(false)
  }, [itemImagePreview])

  const saveItem = async (e) => {
    e.preventDefault()
    setItemModalError('')
    const name = itemForm.name.trim()
    if (!itemForm.category || !name) { setItemModalError('Category and name are required.'); return }
    if (itemForm.base_price === '' || Number(itemForm.base_price) < 0) { setItemModalError('Valid base price is required.'); return }
    setItemSaving(true)
    try {
      const payload = {
        category: itemForm.category,
        name,
        description: itemForm.description.trim(),
        base_price: String(itemForm.base_price),
        hsn_code: itemForm.hsn_code.trim(),
        gst_percentage: String(itemForm.gst_percentage || 0),
        unit_type: 'per_service',
        applicable_vehicle_types: itemForm.applicable_vehicle_types,
        is_active: itemForm.is_active,
      }
      let savedId
      if (itemModal === 'create') {
        const created = await createServiceItem(payload)
        savedId = created.id
        showToast('success', 'Service item created.')
      } else if (itemModal?.type === 'edit') {
        await updateServiceItem(itemModal.id, payload)
        savedId = itemModal.id
        showToast('success', 'Service item updated.')
      }
      if (savedId) {
        setItemImageUploading(true)
        try {
          if (itemImageFile) {
            await uploadServiceItemImage(savedId, itemImageFile)
          } else if (itemImageRemoving && itemImageCurrent) {
            await deleteServiceItemImage(savedId)
          }
        } catch (imgErr) {
          showToast('error', imgErr.message || 'Image operation failed.')
        } finally {
          setItemImageUploading(false)
        }
      }
      closeItemModal()
      await loadItems(itemPage)
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      setItemModalError(err.message || 'Save failed.')
    } finally {
      setItemSaving(false)
    }
  }

  const confirmDeleteItem = async () => {
    if (!itemDelete?.id) return
    try {
      await deleteServiceItem(itemDelete.id)
      showToast('success', 'Service item deleted.')
      setItemDelete(null)
      await loadItems(itemPage)
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      showToast('error', err.message || 'Delete failed.')
    }
  }

  const toggleVtItem = (code) => {
    setItemForm((p) => {
      const list = p.applicable_vehicle_types || []
      return { ...p, applicable_vehicle_types: list.includes(code) ? list.filter((c) => c !== code) : [...list, code] }
    })
  }

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */
  return (
    <>
      <AdminShell activeNav="services">
        <div className="mx-auto max-w-[1180px] space-y-5">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Services</h2>
            <p className="mt-1 text-slate-500 dark:text-slate-400">Manage service categories and billable service items.</p>
          </div>

          <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40">
            {[
              ['categories', 'Categories'],
              ['items', 'Items'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                  tab === id ? 'text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                style={tab === id ? { backgroundColor: theme.accent } : undefined}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ==================== CATEGORIES TAB ==================== */}
          {tab === 'categories' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative min-w-[220px] flex-1 max-w-md">
                  <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    value={catSearch}
                    onChange={(e) => setCatSearch(e.target.value)}
                    placeholder="Search categories by name..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-700"
                  />
                </div>
                <button
                  type="button"
                  onClick={openCatCreate}
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow"
                  style={{ backgroundColor: theme.accent }}
                >
                  <Plus size={18} /> Add category
                </button>
              </div>
              {catError ? <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/20 px-4 py-3 text-sm text-rose-800 dark:text-rose-400">{catError}</div> : null}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Vehicle Type</th>
                        <th className="px-6 py-4 w-40 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                      {catLoading ? (
                        <tr><td colSpan={4} className="px-6 py-8 text-slate-500 dark:text-slate-400">Loading…</td></tr>
                      ) : filteredCategories.length === 0 ? (
                        <tr><td colSpan={4} className="px-6 py-8 text-slate-500 dark:text-slate-400">No categories found.</td></tr>
                      ) : (
                        filteredCategories.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                            <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{c.name}</td>
                            <td className="px-6 py-3 text-slate-600 dark:text-slate-400">
                              {(c.applicable_vehicle_types || []).length > 0
                                ? c.applicable_vehicle_types.map((code) => {
                                    const vt = vehicleTypes.find((v) => v.code === code)
                                    return vt?.name || code
                                  }).join(', ')
                                : <span className="text-slate-400 dark:text-slate-600">All</span>}
                            </td>

                            <td className="px-6 py-3">
                              <div className="flex justify-center gap-1 text-slate-500 dark:text-slate-400">
                                <button type="button" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800" title="Edit" onClick={() => openCatEdit(c)}><Pencil size={16} /></button>
                                <button type="button" className="rounded-lg p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600" title="Delete" onClick={() => setCatDelete(c)}><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 text-sm text-slate-500 dark:border-slate-800/60 dark:text-slate-400">
                  <p>Showing {filteredCategories.length} of {catData.count} categories</p>
                  <div className="flex items-center gap-2">
                    <button type="button" disabled={!catData.previous} onClick={() => loadCategories(catPage - 1)} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40">Prev</button>
                    <span className="rounded-lg px-3 py-1.5 text-white" style={{ backgroundColor: theme.accent }}>{catPage}</span>
                    <button type="button" disabled={!catData.next} onClick={() => loadCategories(catPage + 1)} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40">Next</button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ==================== ITEMS TAB ==================== */
            <div className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="relative min-w-[200px] flex-1 max-w-xs">
                  <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400" htmlFor="item_filter_cat">Filter by category</label>
                  <div className="relative" ref={catFilterDropdownRef}>
                    <button
                      id="item_filter_cat"
                      type="button"
                      onClick={() => { setIsCatModalDropdownOpen(false); setIsCatFilterDropdownOpen((prev) => !prev) }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-9 text-left text-sm font-medium text-slate-700 outline-none transition hover:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:hover:border-slate-700"
                    >
                      {selectedFilterCat?.name || 'All categories'}
                    </button>
                    <ChevronDown size={16} className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition ${isCatFilterDropdownOpen ? 'rotate-180' : ''}`} />
                    {isCatFilterDropdownOpen ? (
                      <div className="absolute left-0 right-0 z-20 mt-2 max-h-56 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                        <button
                          type="button"
                          onClick={() => { setItemCatFilter(''); setIsCatFilterDropdownOpen(false) }}
                          className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${!itemCatFilter ? 'font-semibold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                          style={!itemCatFilter ? { backgroundColor: theme.accentSoft, color: theme.accent } : undefined}
                        >
                          {!itemCatFilter ? <Check size={14} /> : <span className="w-[14px]" />}
                          All categories
                        </button>
                        {sortedCategories.map((c) => {
                          const sel = String(itemCatFilter) === String(c.id)
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => { setItemCatFilter(String(c.id)); setIsCatFilterDropdownOpen(false) }}
                              className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${sel ? 'font-semibold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                              style={sel ? { backgroundColor: theme.accentSoft, color: theme.accent } : undefined}
                            >
                              {sel ? <Check size={14} /> : <span className="w-[14px]" />}
                              <span className="min-w-0 flex-1 truncate">{c.name}</span>
                            </button>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="relative min-w-[220px] flex-1 max-w-md">
                  <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="Search items..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-700"
                  />
                </div>
                <button
                  type="button"
                  onClick={openItemCreate}
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow"
                  style={{ backgroundColor: theme.accent }}
                >
                  <Plus size={18} /> Add item
                </button>
              </div>
              {itemError ? <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/20 px-4 py-3 text-sm text-rose-800 dark:text-rose-400">{itemError}</div> : null}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="px-6 py-4 w-14">Icon</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Price</th>
                        <th className="px-6 py-4">GST %</th>
                        <th className="px-6 py-4 w-40 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                      {itemLoading ? (
                        <tr><td colSpan={7} className="px-6 py-8 text-slate-500 dark:text-slate-400">Loading…</td></tr>
                      ) : filteredItems.length === 0 ? (
                        <tr><td colSpan={7} className="px-6 py-8 text-slate-500 dark:text-slate-400">No service items found.</td></tr>
                      ) : (
                        filteredItems.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                            <td className="px-6 py-3">
                              {item.image_url
                                ? <img src={item.image_url} alt="" className="h-9 w-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700" />
                                : <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800"><Wrench size={16} className="text-slate-400 dark:text-slate-500" /></span>
                              }
                            </td>
                            <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{item.category_name}</td>
                            <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{item.name}</td>
                            <td className="px-6 py-3 text-slate-600 dark:text-slate-400">₹{Number(item.base_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{item.gst_percentage}%</td>

                            <td className="px-6 py-3">
                              <div className="flex justify-center gap-1 text-slate-500 dark:text-slate-400">
                                <button type="button" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800" title="Edit" onClick={() => openItemEdit(item)}><Pencil size={16} /></button>
                                <button type="button" className="rounded-lg p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600" title="Delete" onClick={() => setItemDelete(item)}><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 text-sm text-slate-500 dark:border-slate-800/60 dark:text-slate-400">
                  <p>Showing {filteredItems.length} of {itemData.count} items</p>
                  <div className="flex items-center gap-2">
                    <button type="button" disabled={!itemData.previous} onClick={() => loadItems(itemPage - 1)} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40">Prev</button>
                    <span className="rounded-lg px-3 py-1.5 text-white" style={{ backgroundColor: theme.accent }}>{itemPage}</span>
                    <button type="button" disabled={!itemData.next} onClick={() => loadItems(itemPage + 1)} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40">Next</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminShell>

      {/* ==================== Category Modal ==================== */}
      {catModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800/60 dark:bg-slate-950">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{catModal === 'create' ? 'New category' : 'Edit category'}</h3>
              <button type="button" className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={closeCatModal}><X size={18} /></button>
            </div>
            <form onSubmit={saveCategory} className="mt-4 space-y-4">
              {catModalError ? <div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 text-sm text-rose-700 dark:text-rose-400">{catModalError}</div> : null}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Name</label>
                <input
                  value={catForm.name}
                  onChange={(e) => { setCatModalError(''); setCatForm((p) => ({ ...p, name: e.target.value })) }}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 dark:focus:border-slate-600 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  placeholder="e.g. Engine & Lubrication"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Vehicle Type</label>
                <div className="relative" ref={vtCatDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsVtCatDropdownOpen((prev) => !prev)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2.5 pr-9 text-left text-sm font-medium text-slate-700 dark:text-slate-200 outline-none transition hover:border-slate-300 dark:hover:border-slate-600"
                  >
                    {(catForm.applicable_vehicle_types || []).length > 0
                      ? catForm.applicable_vehicle_types.map((code) => vehicleTypes.find((v) => v.code === code)?.name || code).join(', ')
                      : 'Select vehicle type'}
                  </button>
                  <ChevronDown size={16} className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition ${isVtCatDropdownOpen ? 'rotate-180' : ''}`} />
                  {isVtCatDropdownOpen ? (
                    <div className="absolute left-0 right-0 z-[60] mt-2 max-h-56 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                      {vehicleTypes.map((vt) => {
                        const sel = (catForm.applicable_vehicle_types || []).includes(vt.code)
                        return (
                          <button
                            key={vt.id}
                            type="button"
                            onClick={() => toggleVtCat(vt.code)}
                            className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${sel ? 'font-semibold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                            style={sel ? { backgroundColor: theme.accentSoft, color: theme.accent } : undefined}
                          >
                            {sel ? <Check size={14} /> : <span className="w-[14px]" />}
                            <span className="min-w-0 flex-1 truncate">{vt.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400" onClick={closeCatModal}>Cancel</button>
                <button
                  type="submit"
                  disabled={catSaving}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: theme.accent }}
                >
                  {catSaving ? 'Saving…' : catModal === 'create' ? 'Save' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {catDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800/60 dark:bg-slate-950">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete category</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Delete <span className="font-semibold">{catDelete.name}</span>? All items in this category will also be archived.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400" onClick={() => setCatDelete(null)}>Cancel</button>
              <button type="button" className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white" onClick={confirmDeleteCategory}>Delete</button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ==================== Item Modal ==================== */}
      {itemModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto dark:border-slate-800/60 dark:bg-slate-950">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{itemModal === 'create' ? 'New service item' : 'Edit service item'}</h3>
              <button type="button" className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={closeItemModal}><X size={18} /></button>
            </div>
            <form onSubmit={saveItem} className="mt-4 space-y-4">
              {itemModalError ? <div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 text-sm text-rose-700 dark:text-rose-400">{itemModalError}</div> : null}

              {/* Category dropdown */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Category</label>
                <div className="relative" ref={catModalDropdownRef}>
                  <button
                    type="button"
                    onClick={() => { setItemModalError(''); setIsVtItemDropdownOpen(false); setIsCatModalDropdownOpen((prev) => !prev) }}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2.5 pr-9 text-left text-sm font-medium text-slate-700 dark:text-slate-200 outline-none transition hover:border-slate-300 dark:hover:border-slate-600"
                  >
                    {selectedModalCat?.name || 'Select category'}
                  </button>
                  <ChevronDown size={16} className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition ${isCatModalDropdownOpen ? 'rotate-180' : ''}`} />
                  {isCatModalDropdownOpen ? (
                    <div className="absolute left-0 right-0 z-[60] mt-2 max-h-56 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                      <button
                        type="button"
                        onClick={() => { setItemForm((p) => ({ ...p, category: '' })); setIsCatModalDropdownOpen(false) }}
                        className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${!itemForm.category ? 'font-semibold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        style={!itemForm.category ? { backgroundColor: theme.accentSoft, color: theme.accent } : undefined}
                      >
                        {!itemForm.category ? <Check size={14} /> : <span className="w-[14px]" />}
                        Select category
                      </button>
                      {sortedCategories.map((c) => {
                        const sel = String(itemForm.category) === String(c.id)
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => { setItemForm((p) => ({ ...p, category: String(c.id) })); setIsCatModalDropdownOpen(false) }}
                            className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${sel ? 'font-semibold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                            style={sel ? { backgroundColor: theme.accentSoft, color: theme.accent } : undefined}
                          >
                            {sel ? <Check size={14} /> : <span className="w-[14px]" />}
                            <span className="min-w-0 flex-1 truncate">{c.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Name</label>
                <input
                  value={itemForm.name}
                  onChange={(e) => { setItemModalError(''); setItemForm((p) => ({ ...p, name: e.target.value })) }}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 dark:focus:border-slate-600 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  placeholder="e.g. Oil Change"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Description</label>
                <textarea
                  value={itemForm.description}
                  onChange={(e) => setItemForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 dark:focus:border-slate-600 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  placeholder="Printed on invoice (optional)"
                />
              </div>

              {/* Price + GST row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Base Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemForm.base_price}
                    onChange={(e) => { setItemModalError(''); setItemForm((p) => ({ ...p, base_price: e.target.value })) }}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 dark:focus:border-slate-600"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">GST %</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemForm.gst_percentage}
                    onChange={(e) => setItemForm((p) => ({ ...p, gst_percentage: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 dark:focus:border-slate-600"
                    placeholder="18.00"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">HSN Code</label>
                <input
                  value={itemForm.hsn_code}
                  onChange={(e) => setItemForm((p) => ({ ...p, hsn_code: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 dark:focus:border-slate-600 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  placeholder="998714"
                  maxLength={8}
                />
              </div>

              {/* Vehicle type */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Vehicle Type</label>
                <div className="relative" ref={vtItemDropdownRef}>
                  <button
                    type="button"
                    onClick={() => { setIsCatModalDropdownOpen(false); setIsVtItemDropdownOpen((prev) => !prev) }}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2.5 pr-9 text-left text-sm font-medium text-slate-700 dark:text-slate-200 outline-none transition hover:border-slate-300 dark:hover:border-slate-600"
                  >
                    {(itemForm.applicable_vehicle_types || []).length > 0
                      ? itemForm.applicable_vehicle_types.map((code) => vehicleTypes.find((v) => v.code === code)?.name || code).join(', ')
                      : 'Select vehicle type'}
                  </button>
                  <ChevronDown size={16} className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition ${isVtItemDropdownOpen ? 'rotate-180' : ''}`} />
                  {isVtItemDropdownOpen ? (
                    <div className="absolute left-0 right-0 z-[60] mt-2 max-h-56 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                      {vehicleTypes.map((vt) => {
                        const sel = (itemForm.applicable_vehicle_types || []).includes(vt.code)
                        return (
                          <button
                            key={vt.id}
                            type="button"
                            onClick={() => toggleVtItem(vt.code)}
                            className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${sel ? 'font-semibold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                            style={sel ? { backgroundColor: theme.accentSoft, color: theme.accent } : undefined}
                          >
                            {sel ? <Check size={14} /> : <span className="w-[14px]" />}
                            <span className="min-w-0 flex-1 truncate">{vt.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              </div>



              {/* Image upload */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Service Icon / Image <span className="font-normal text-slate-400 dark:text-slate-600">(PNG, JPG, WEBP · max 2 MB)</span>
                </label>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (itemImagePreview) URL.revokeObjectURL(itemImagePreview)
                    setItemImageFile(file)
                    setItemImagePreview(URL.createObjectURL(file))
                    setItemImageRemoving(false)
                    e.target.value = ''
                  }}
                />
                {(itemImagePreview || (itemImageCurrent && !itemImageRemoving)) ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={itemImagePreview || itemImageCurrent}
                      alt="Preview"
                      className="h-16 w-16 rounded-xl border border-slate-200 dark:border-slate-700 object-cover shadow-sm"
                    />
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <ImagePlus size={13} /> Replace
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (itemImagePreview) URL.revokeObjectURL(itemImagePreview)
                          setItemImageFile(null)
                          setItemImagePreview(null)
                          if (itemImageCurrent) setItemImageRemoving(true)
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/40"
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 py-5 text-sm font-medium text-slate-500 dark:text-slate-400 transition hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Upload size={18} className="text-slate-400 dark:text-slate-500" />
                    Click to upload image
                  </button>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400" onClick={closeItemModal}>Cancel</button>
                <button
                  type="submit"
                  disabled={itemSaving || itemImageUploading}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: theme.accent }}
                >
                  {itemImageUploading ? 'Uploading…' : itemSaving ? 'Saving…' : itemModal === 'create' ? 'Save' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {itemDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete service item</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Delete <span className="font-semibold">{itemDelete.name}</span>?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400" onClick={() => setItemDelete(null)}>Cancel</button>
              <button type="button" className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white" onClick={confirmDeleteItem}>Delete</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
