import { useEffect, useState } from 'react'
import { FileText, Plus, Trash2 } from 'lucide-react'
import { useToast } from '../../context/ToastContext.jsx'
import { useTenantBranding } from '../../context/TenantBrandingContext.jsx'
import { deleteVehicleDocument, fetchVehicleDocuments, uploadVehicleDocument } from '../../utils/dealerDocuments'
import UploadDocumentModal from './UploadDocumentModal'

export default function VehicleDocumentsTab({ vehicle }) {
  const { theme } = useTenantBranding()
  const { showToast } = useToast()
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const load = () => {
    setLoading(true)
    fetchVehicleDocuments(vehicle.id)
      .then((data) => setDocs(Array.isArray(data) ? data : data?.results || []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [vehicle.id])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{docs.length} document{docs.length === 1 ? '' : 's'} on file</p>
        <button type="button" onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: theme.accent }}>
          <Plus size={14} /> Upload Document
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : docs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 dark:border-slate-800/60 dark:bg-slate-900/40">
          No documents uploaded yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((d) => (
            <div key={d.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                <FileText size={18} className="text-slate-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold uppercase text-slate-900 dark:text-white">{d.document_type.replace(/_/g, ' ')}</p>
                {d.notes ? <p className="truncate text-xs text-slate-500 dark:text-slate-400">{d.notes}</p> : null}
                <a href={d.file_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs underline" style={{ color: theme.accent }}>
                  View file
                </a>
              </div>
              <button
                type="button"
                title="Delete"
                onClick={async () => {
                  if (!globalThis.confirm('Delete this document?')) return
                  await deleteVehicleDocument(vehicle.id, d.id)
                  showToast('success', 'Document deleted.')
                  load()
                }}
                className="shrink-0 rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {modalOpen ? (
        <UploadDocumentModal
          onClose={() => setModalOpen(false)}
          onSubmit={async (payload) => {
            await uploadVehicleDocument(vehicle.id, payload)
            showToast('success', 'Document uploaded.')
            load()
          }}
        />
      ) : null}
    </div>
  )
}
