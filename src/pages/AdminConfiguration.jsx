import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import AdminShell from '../components/AdminShell'
import { useToast } from '../context/ToastContext.jsx'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import {
  createBrand,
  createModel,
  deleteBrand,
  deleteModel,
  fetchBrands,
  fetchModels,
  fetchVehicleTypes,
  updateBrand,
  updateModel,
} from '../utils/vehicles'

const emptyBrand = { name: '', is_active: true }
const emptyModel = { brand: '', vehicle_type: '', name: '', is_active: true }

export default function AdminConfiguration() {
  const { theme } = useTenantBranding()
  const [tab, setTab] = useState('brands')
  const { showToast } = useToast()

  /* Brands */
  const [brandsData, setBrandsData] = useState({ count: 0, next: null, previous: null, results: [] })
  const [brandPage, setBrandPage] = useState(1)
  const [brandSearch, setBrandSearch] = useState('')
  const [brandLoading, setBrandLoading] = useState(true)
  const [brandError, setBrandError] = useState('')
  const [brandModal, setBrandModal] = useState(null)
  const [brandModalError, setBrandModalError] = useState('')
  const [brandForm, setBrandForm] = useState(emptyBrand)
  const [brandSaving, setBrandSaving] = useState(false)
  const [brandDelete, setBrandDelete] = useState(null)
  const [brandAll, setBrandAll] = useState([])

  const loadBrands = useCallback(async (page = 1) => {
    setBrandLoading(true)
    setBrandError('')
    try {
      const data = await fetchBrands({ page, pageSize: 10 })
      setBrandsData(data)
      setBrandPage(page)
    } catch (e) {
      if (e.message === 'SESSION_EXPIRED') {
        globalThis.location.href = '/admin'
        return
      }
      setBrandError(e.message)
    } finally {
      setBrandLoading(false)
    }
  }, [])

  const loadAllBrands = useCallback(async () => {
    try {
      const data = await fetchBrands({ page: 1, pageSize: 100, isActive: true })
      setBrandAll(data.results || [])
    } catch {
      setBrandAll([])
    }
  }, [])

  useEffect(() => {
    loadBrands(1)
  }, [loadBrands])

  useEffect(() => {
    if (tab === 'models') {
      loadAllBrands()
      fetchVehicleTypes().then((data) => setVehicleTypes(Array.isArray(data) ? data : [])).catch(() => setVehicleTypes([]))
    }
  }, [tab, loadAllBrands])

  const filteredBrands = useMemo(() => {
    const q = brandSearch.trim().toLowerCase()
    const rows = brandsData.results || []
    if (!q) return rows
    return rows.filter((b) => b.name?.toLowerCase().includes(q))
  }, [brandsData.results, brandSearch])

  const openBrandCreate = () => {
    setBrandModalError('')
    setBrandForm(emptyBrand)
    setBrandModal('create')
  }
  const openBrandEdit = (b) => {
    setBrandModalError('')
    setBrandForm({ name: b.name || '', is_active: Boolean(b.is_active) })
    setBrandModal({ type: 'edit', id: b.id })
  }

  const closeBrandModal = () => {
    setBrandModalError('')
    setBrandModal(null)
  }

  const saveBrand = async (e) => {
    e.preventDefault()
    setBrandModalError('')
    const name = brandForm.name.trim()
    if (!name) {
      setBrandModalError('Name is required.')
      return
    }
    setBrandSaving(true)
    try {
      const payload = { name, is_active: brandForm.is_active }
      if (brandModal === 'create') {
        await createBrand(payload)
        showToast('success', 'Brand created.')
      } else if (brandModal?.type === 'edit') {
        await updateBrand(brandModal.id, payload)
        showToast('success', 'Brand updated.')
      }
      closeBrandModal()
      await loadBrands(brandPage)
      await loadAllBrands()
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') {
        globalThis.location.href = '/admin'
        return
      }
      setBrandModalError(err.message || 'Save failed.')
    } finally {
      setBrandSaving(false)
    }
  }

  const confirmDeleteBrand = async () => {
    if (!brandDelete?.id) return
    try {
      await deleteBrand(brandDelete.id)
      showToast('success', 'Brand deleted.')
      setBrandDelete(null)
      await loadBrands(brandPage)
      await loadAllBrands()
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') {
        globalThis.location.href = '/admin'
        return
      }
      showToast('error', err.message || 'Delete failed.')
    }
  }

  /* Models */
  const [modelsData, setModelsData] = useState({ count: 0, next: null, previous: null, results: [] })
  const [modelPage, setModelPage] = useState(1)
  const [modelSearch, setModelSearch] = useState('')
  const [modelBrandFilter, setModelBrandFilter] = useState('')
  const [modelLoading, setModelLoading] = useState(true)
  const [modelError, setModelError] = useState('')
  const [modelModal, setModelModal] = useState(null)
  const [modelModalError, setModelModalError] = useState('')
  const [modelForm, setModelForm] = useState(emptyModel)
  const [modelSaving, setModelSaving] = useState(false)
  const [modelDelete, setModelDelete] = useState(null)
  const [isBrandFilterDropdownOpen, setIsBrandFilterDropdownOpen] = useState(false)
  const [isBrandModalDropdownOpen, setIsBrandModalDropdownOpen] = useState(false)
  const [isVehicleTypeModalDropdownOpen, setIsVehicleTypeModalDropdownOpen] = useState(false)
  const [vehicleTypes, setVehicleTypes] = useState([])
  const brandFilterDropdownRef = useRef(null)
  const brandModalDropdownRef = useRef(null)
  const vehicleTypeModalDropdownRef = useRef(null)

  const sortedBrands = useMemo(() => {
    const rows = brandAll || []
    return [...rows].sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }),
    )
  }, [brandAll])

  const selectedFilterBrand = useMemo(
    () => brandAll.find((b) => String(b.id) === String(modelBrandFilter)),
    [brandAll, modelBrandFilter],
  )

  const selectedModalBrand = useMemo(
    () => brandAll.find((b) => String(b.id) === String(modelForm.brand)),
    [brandAll, modelForm.brand],
  )

  const selectedModalVehicleType = useMemo(
    () => vehicleTypes.find((t) => String(t.id) === String(modelForm.vehicle_type)),
    [vehicleTypes, modelForm.vehicle_type],
  )

  useEffect(() => {
    if (!isBrandFilterDropdownOpen && !isBrandModalDropdownOpen && !isVehicleTypeModalDropdownOpen) return undefined

    const handlePointerDown = (event) => {
      const filterRoot = brandFilterDropdownRef.current
      if (filterRoot && !filterRoot.contains(event.target)) setIsBrandFilterDropdownOpen(false)

      const modalRoot = brandModalDropdownRef.current
      if (modalRoot && !modalRoot.contains(event.target)) setIsBrandModalDropdownOpen(false)

      const vtRoot = vehicleTypeModalDropdownRef.current
      if (vtRoot && !vtRoot.contains(event.target)) setIsVehicleTypeModalDropdownOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [isBrandFilterDropdownOpen, isBrandModalDropdownOpen, isVehicleTypeModalDropdownOpen])

  const loadModels = useCallback(
    async (page = 1) => {
      setModelLoading(true)
      setModelError('')
      try {
        const data = await fetchModels({
          page,
          pageSize: 10,
          brandId: modelBrandFilter || undefined,
        })
        setModelsData(data)
        setModelPage(page)
      } catch (e) {
        if (e.message === 'SESSION_EXPIRED') {
          globalThis.location.href = '/admin'
          return
        }
        setModelError(e.message)
      } finally {
        setModelLoading(false)
      }
    },
    [modelBrandFilter],
  )

  useEffect(() => {
    if (tab !== 'models') return
    loadModels(1)
  }, [tab, modelBrandFilter, loadModels])

  const filteredModels = useMemo(() => {
    const q = modelSearch.trim().toLowerCase()
    const rows = modelsData.results || []
    if (!q) return rows
    return rows.filter(
      (m) => m.name?.toLowerCase().includes(q) || m.brand_name?.toLowerCase().includes(q),
    )
  }, [modelsData.results, modelSearch])

  const openModelCreate = async () => {
    setModelModalError('')
    setIsBrandFilterDropdownOpen(false)
    let list = brandAll
    if (!list.length) {
      try {
        const data = await fetchBrands({ page: 1, pageSize: 100, isActive: true })
        list = data.results || []
        setBrandAll(list)
      } catch {
        list = []
      }
    }
    setModelForm({ ...emptyModel, brand: '', vehicle_type: '' })
    setIsBrandModalDropdownOpen(false)
    setIsVehicleTypeModalDropdownOpen(false)
    setModelModal('create')
  }
  const openModelEdit = (m) => {
    setModelModalError('')
    setIsBrandFilterDropdownOpen(false)
    setModelForm({
      brand: String(m.brand || ''),
      vehicle_type: String(m.vehicle_type || ''),
      name: m.name || '',
      is_active: Boolean(m.is_active),
    })
    setIsBrandModalDropdownOpen(false)
    setIsVehicleTypeModalDropdownOpen(false)
    setModelModal({ type: 'edit', id: m.id })
  }

  const closeModelModal = useCallback(() => {
    setModelModalError('')
    setIsBrandModalDropdownOpen(false)
    setIsVehicleTypeModalDropdownOpen(false)
    setModelModal(null)
  }, [])

  const saveModel = async (e) => {
    e.preventDefault()
    setModelModalError('')
    const name = modelForm.name.trim()
    if (!modelForm.brand || !name) {
      setModelModalError('Brand and name are required.')
      return
    }
    setModelSaving(true)
    try {
      const payload = { brand: modelForm.brand, vehicle_type: modelForm.vehicle_type || null, name, is_active: modelForm.is_active }
      if (modelModal === 'create') {
        await createModel(payload)
        showToast('success', 'Model created.')
      } else if (modelModal?.type === 'edit') {
        await updateModel(modelModal.id, payload)
        showToast('success', 'Model updated.')
      }
      closeModelModal()
      await loadModels(modelPage)
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') {
        globalThis.location.href = '/admin'
        return
      }
      setModelModalError(err.message || 'Save failed.')
    } finally {
      setModelSaving(false)
    }
  }

  const confirmDeleteModel = async () => {
    if (!modelDelete?.id) return
    try {
      await deleteModel(modelDelete.id)
      showToast('success', 'Model deleted.')
      setModelDelete(null)
      await loadModels(modelPage)
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') {
        globalThis.location.href = '/admin'
        return
      }
      showToast('error', err.message || 'Delete failed.')
    }
  }

  return (
    <>
      <AdminShell activeNav="configuration">
        <div className="mx-auto max-w-[1180px] space-y-5">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Configuration</h2>
            <p className="mt-1 text-slate-500 dark:text-slate-400">Manage vehicle brands and models for your workshop.</p>
          </div>

          <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40">
            {[
              ['brands', 'Brands'],
              ['models', 'Models'],
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

          {tab === 'brands' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative min-w-[220px] flex-1 max-w-md">
                  <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    placeholder="Search brands by name..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-700"
                  />
                </div>
                <button
                  type="button"
                  onClick={openBrandCreate}
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow"
                  style={{ backgroundColor: theme.accent }}
                >
                  <Plus size={18} /> Add brand
                </button>
              </div>
              {brandError ? <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/20 px-4 py-3 text-sm text-rose-800 dark:text-rose-400">{brandError}</div> : null}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4 w-40">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                      {brandLoading ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-slate-500 dark:text-slate-400">Loading…</td>
                        </tr>
                      ) : filteredBrands.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-slate-500 dark:text-slate-400">No brands found.</td>
                        </tr>
                      ) : (
                        filteredBrands.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                            <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{b.name}</td>

                            <td className="px-6 py-3">
                              <div className="flex gap-1 text-slate-500 dark:text-slate-400">
                                <button type="button" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800" title="Edit" onClick={() => openBrandEdit(b)}>
                                  <Pencil size={16} />
                                </button>
                                <button type="button" className="rounded-lg p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600" title="Delete" onClick={() => setBrandDelete(b)}>
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                  <p>Showing {filteredBrands.length} of {brandsData.count} brands</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!brandsData.previous}
                      onClick={() => loadBrands(brandPage - 1)}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <span className="rounded-lg px-3 py-1.5 text-white" style={{ backgroundColor: theme.accent }}>{brandPage}</span>
                    <button
                      type="button"
                      disabled={!brandsData.next}
                      onClick={() => loadBrands(brandPage + 1)}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="relative min-w-[200px] flex-1 max-w-xs">
                  <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400" htmlFor="model_filter_brand">
                    Filter by brand
                  </label>
                  <div className="relative" ref={brandFilterDropdownRef}>
                    <button
                      id="model_filter_brand"
                      type="button"
                      onClick={() => {
                        setIsBrandModalDropdownOpen(false)
                        setIsBrandFilterDropdownOpen((prev) => !prev)
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-9 text-left text-sm font-medium text-slate-700 outline-none transition hover:border-slate-400 dark:border-slate-800/60 dark:bg-slate-950/50 dark:text-slate-100 dark:hover:bg-slate-700"
                    >
                      {selectedFilterBrand?.name || 'All brands'}
                    </button>
                    <ChevronDown
                      size={16}
                      className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition ${isBrandFilterDropdownOpen ? 'rotate-180' : ''}`}
                    />
                    {isBrandFilterDropdownOpen ? (
                      <div className="absolute left-0 right-0 z-20 mt-2 max-h-56 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                        <button
                          type="button"
                          onClick={() => {
                            setModelBrandFilter('')
                            setIsBrandFilterDropdownOpen(false)
                          }}
                          className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${!modelBrandFilter ? 'font-semibold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                          style={!modelBrandFilter ? { backgroundColor: theme.accentSoft, color: theme.accent } : undefined}
                        >
                          {!modelBrandFilter ? <Check size={14} /> : <span className="w-[14px]" />}
                          All brands
                        </button>
                        {sortedBrands.map((b) => {
                          const sel = String(modelBrandFilter) === String(b.id)
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => {
                                setModelBrandFilter(String(b.id))
                                setIsBrandFilterDropdownOpen(false)
                              }}
                              className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${sel ? 'font-semibold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                              style={sel ? { backgroundColor: theme.accentSoft, color: theme.accent } : undefined}
                            >
                              {sel ? <Check size={14} /> : <span className="w-[14px]" />}
                              <span className="min-w-0 flex-1 truncate">{b.name}</span>
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
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    placeholder="Search models..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-700"
                  />
                </div>
                <button
                  type="button"
                  onClick={openModelCreate}
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow"
                  style={{ backgroundColor: theme.accent }}
                >
                  <Plus size={18} /> Add model
                </button>
              </div>
              {modelError ? <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/20 px-4 py-3 text-sm text-rose-800 dark:text-rose-400">{modelError}</div> : null}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="px-6 py-4">Brand</th>
                        <th className="px-6 py-4">Model</th>
                        <th className="px-6 py-4">Vehicle Type</th>
                        <th className="px-6 py-4 w-40">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                      {modelLoading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-slate-500 dark:text-slate-400">Loading…</td>
                        </tr>
                      ) : filteredModels.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-slate-500 dark:text-slate-400">No models found.</td>
                        </tr>
                      ) : (
                        filteredModels.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                            <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{m.brand_name || '—'}</td>
                            <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{m.name}</td>
                            <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{m.vehicle_type_name || '—'}</td>

                            <td className="px-6 py-3">
                              <div className="flex gap-1 text-slate-500 dark:text-slate-400">
                                <button type="button" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800" title="Edit" onClick={() => openModelEdit(m)}>
                                  <Pencil size={16} />
                                </button>
                                <button type="button" className="rounded-lg p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600" title="Delete" onClick={() => setModelDelete(m)}>
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                  <p>Showing {filteredModels.length} of {modelsData.count} models</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!modelsData.previous}
                      onClick={() => loadModels(modelPage - 1)}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <span className="rounded-lg px-3 py-1.5 text-white" style={{ backgroundColor: theme.accent }}>{modelPage}</span>
                    <button
                      type="button"
                      disabled={!modelsData.next}
                      onClick={() => loadModels(modelPage + 1)}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminShell>

      {/* Brand modal */}
      {brandModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800/60 dark:bg-slate-950">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{brandModal === 'create' ? 'New brand' : 'Edit brand'}</h3>
              <button type="button" className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={closeBrandModal}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={saveBrand} className="mt-4 space-y-4">
              {brandModalError ? (
                <div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 text-sm text-rose-700 dark:text-rose-400">{brandModalError}</div>
              ) : null}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Name</label>
                <input
                  value={brandForm.name}
                  onChange={(e) => {
                    setBrandModalError('')
                    setBrandForm((p) => ({ ...p, name: e.target.value }))
                  }}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 dark:focus:border-slate-600 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  placeholder="Display name"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400" onClick={closeBrandModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={brandSaving}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: theme.accent }}
                >
                  {brandSaving ? 'Saving…' : brandModal === 'create' ? 'Save' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {brandDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800/60 dark:bg-slate-950">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete brand</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Delete <span className="font-semibold">{brandDelete.name}</span>? This may fail if vehicles reference it.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400" onClick={() => setBrandDelete(null)}>
                Cancel
              </button>
              <button type="button" className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white" onClick={confirmDeleteBrand}>
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Model modal */}
      {modelModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800/60 dark:bg-slate-950">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{modelModal === 'create' ? 'New model' : 'Edit model'}</h3>
              <button type="button" className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={closeModelModal}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={saveModel} className="mt-4 space-y-4">
              {modelModalError ? (
                <div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 text-sm text-rose-700 dark:text-rose-400">{modelModalError}</div>
              ) : null}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400" htmlFor="model_modal_brand">
                  Brand
                </label>
                <div className="relative" ref={brandModalDropdownRef}>
                  <button
                    id="model_modal_brand"
                    type="button"
                    onClick={() => {
                      setModelModalError('')
                      setIsBrandFilterDropdownOpen(false)
                      setIsVehicleTypeModalDropdownOpen(false)
                      setIsBrandModalDropdownOpen((prev) => !prev)
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-9 text-left text-sm font-medium text-slate-700 outline-none transition hover:border-slate-400 dark:border-slate-800/60 dark:bg-slate-950/50 dark:text-slate-100 dark:hover:border-slate-700"
                  >
                    {selectedModalBrand?.name || 'Select brand'}
                  </button>
                  <ChevronDown
                    size={16}
                    className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition ${isBrandModalDropdownOpen ? 'rotate-180' : ''}`}
                  />
                  {isBrandModalDropdownOpen ? (
                    <div className="absolute left-0 right-0 z-[60] mt-2 max-h-56 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setModelModalError('')
                          setModelForm((p) => ({ ...p, brand: '' }))
                          setIsBrandModalDropdownOpen(false)
                        }}
                        className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${!modelForm.brand ? 'font-semibold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        style={!modelForm.brand ? { backgroundColor: theme.accentSoft, color: theme.accent } : undefined}
                      >
                        {!modelForm.brand ? <Check size={14} /> : <span className="w-[14px]" />}
                        Select brand
                      </button>
                      {sortedBrands.map((b) => {
                        const sel = String(modelForm.brand) === String(b.id)
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              setModelModalError('')
                              setModelForm((p) => ({ ...p, brand: String(b.id) }))
                              setIsBrandModalDropdownOpen(false)
                            }}
                            className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${sel ? 'font-semibold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                            style={sel ? { backgroundColor: theme.accentSoft, color: theme.accent } : undefined}
                          >
                            {sel ? <Check size={14} /> : <span className="w-[14px]" />}
                            <span className="min-w-0 flex-1 truncate">{b.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Vehicle Type</label>
                <div className="relative" ref={vehicleTypeModalDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setModelModalError('')
                      setIsBrandModalDropdownOpen(false)
                      setIsVehicleTypeModalDropdownOpen((prev) => !prev)
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-9 text-left text-sm font-medium text-slate-700 outline-none transition hover:border-slate-400 dark:border-slate-800/60 dark:bg-slate-950/50 dark:text-slate-100 dark:hover:border-slate-700"
                  >
                    {selectedModalVehicleType?.name || 'Select vehicle type'}
                  </button>
                  <ChevronDown
                    size={16}
                    className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition ${isVehicleTypeModalDropdownOpen ? 'rotate-180' : ''}`}
                  />
                  {isVehicleTypeModalDropdownOpen ? (
                    <div className="absolute left-0 right-0 z-[60] mt-2 max-h-56 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setModelModalError('')
                          setModelForm((p) => ({ ...p, vehicle_type: '' }))
                          setIsVehicleTypeModalDropdownOpen(false)
                        }}
                        className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${!modelForm.vehicle_type ? 'font-semibold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        style={!modelForm.vehicle_type ? { backgroundColor: theme.accentSoft, color: theme.accent } : undefined}
                      >
                        {!modelForm.vehicle_type ? <Check size={14} /> : <span className="w-[14px]" />}
                        Select vehicle type
                      </button>
                      {vehicleTypes.map((t) => {
                        const sel = String(modelForm.vehicle_type) === String(t.id)
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setModelModalError('')
                              setModelForm((p) => ({ ...p, vehicle_type: String(t.id) }))
                              setIsVehicleTypeModalDropdownOpen(false)
                            }}
                            className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${sel ? 'font-semibold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                            style={sel ? { backgroundColor: theme.accentSoft, color: theme.accent } : undefined}
                          >
                            {sel ? <Check size={14} /> : <span className="w-[14px]" />}
                            <span className="min-w-0 flex-1 truncate">{t.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Name</label>
                <input
                  value={modelForm.name}
                  onChange={(e) => {
                    setModelModalError('')
                    setModelForm((p) => ({ ...p, name: e.target.value }))
                  }}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 dark:focus:border-slate-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400" onClick={closeModelModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modelSaving}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: theme.accent }}
                >
                  {modelSaving ? 'Saving…' : modelModal === 'create' ? 'Save' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {modelDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete model</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Delete <span className="font-semibold">{modelDelete.name}</span>?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400" onClick={() => setModelDelete(null)}>
                Cancel
              </button>
              <button type="button" className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white" onClick={confirmDeleteModel}>
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
