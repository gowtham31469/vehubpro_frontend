import { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import { useToast } from '../context/ToastContext.jsx'
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../utils/notifications'

const POLL_INTERVAL_MS = 30000

function timeAgo(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

/**
 * Self-contained bell + dropdown, mirroring AdminShell.jsx's profile dropdown
 * pattern exactly (portal-rendered panel positioned off a button ref, with
 * click-outside-to-close) so AdminShell only needs to render <NotificationBell />.
 */
export default function NotificationBell() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)

  const buttonRef = useRef(null)
  const panelRef = useRef(null)
  const lastCountRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      try {
        const data = await fetchUnreadNotificationCount()
        if (cancelled) return
        const count = data?.count ?? 0
        // Skip the toast on the very first poll — a nonzero count then just
        // means pre-existing unread notifications, not a brand-new one.
        if (lastCountRef.current !== null && count > lastCountRef.current) {
          showToast('info', 'You have a new visit request.')
        }
        lastCountRef.current = count
        setUnreadCount(count)
      } catch {
        // Silent — polling, not worth surfacing transient failures.
      }
    }

    void poll()
    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => { cancelled = true; clearInterval(interval) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!open || !buttonRef.current) return
    const updatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        setPos({ top: rect.bottom + 12, right: window.innerWidth - rect.right })
      }
    }
    updatePosition()
    const header = buttonRef.current?.closest('header')
    if (header) header.addEventListener('scroll', updatePosition, { passive: true })
    window.addEventListener('scroll', updatePosition, { passive: true })
    window.addEventListener('resize', updatePosition, { passive: true })
    return () => {
      if (header) header.removeEventListener('scroll', updatePosition)
      window.removeEventListener('scroll', updatePosition)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open])

  const handleOpen = async () => {
    const next = !open
    setOpen(next)
    if (!next) return
    setLoading(true)
    try {
      const data = await fetchNotifications({ pageSize: 10 })
      setNotifications(data?.results || [])
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  const handleItemClick = async (item) => {
    setOpen(false)
    if (!item.is_read) {
      try {
        await markNotificationRead(item.id)
        setUnreadCount((c) => Math.max(0, c - 1))
      } catch {
        // Navigation still proceeds even if the read-marking call fails.
      }
    }
    if (item.link) navigate(item.link)
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead()
      setUnreadCount(0)
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch {
      // Best-effort.
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open && ReactDOM.createPortal(
        <div
          ref={panelRef}
          className="fixed z-[9999] w-80 origin-top-right overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800"
          style={{ top: `${pos.top}px`, right: `${pos.right}px` }}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Notifications</p>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">Loading...</p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">No notifications yet.</p>
            ) : (
              notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={`flex w-full flex-col items-start gap-0.5 border-b border-slate-50 px-4 py-3 text-left transition last:border-0 hover:bg-slate-50 dark:border-slate-700/60 dark:hover:bg-slate-900/60 ${
                    item.is_read ? '' : 'bg-slate-50/70 dark:bg-slate-900/40'
                  }`}
                >
                  <div className="flex w-full items-center gap-2">
                    {!item.is_read ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" /> : null}
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</p>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.message}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{timeAgo(item.created_at)}</p>
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
