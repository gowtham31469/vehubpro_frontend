/* eslint-disable react-refresh/only-export-components -- hook + provider pattern */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_BRANDING, fetchBrandingByToken, fetchPublicTenantBranding, getStoredBranding, getSubdomain } from '../utils/branding'
import { hexToRgba } from '../utils/themeColors'

const TenantBrandingContext = createContext(null)

export function TenantBrandingProvider({ children }) {
  const [branding, setBranding] = useState(() => getStoredBranding())
  const [subdomain] = useState(() => getSubdomain())
  const [tenantError, setTenantError] = useState(null)

  const [themeMode, setThemeModeState] = useState(() => localStorage.getItem('theme_mode') || 'system')

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    
    function applyTheme() {
      if (themeMode === 'dark' || (themeMode === 'system' && media.matches)) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
    
    applyTheme()
    
    if (themeMode === 'system') {
      media.addEventListener('change', applyTheme)
      return () => media.removeEventListener('change', applyTheme)
    }
  }, [themeMode])

  const setThemeMode = useCallback((newMode) => {
    localStorage.setItem('theme_mode', newMode)
    setThemeModeState(newMode)
  }, [])

  const theme = useMemo(() => {
    const primary = branding?.primary_color || DEFAULT_BRANDING.primary_color
    return {
      accent: primary,
      accentSoft: hexToRgba(primary, 0.12),
    }
  }, [branding])

  // On mount: if running on a tenant subdomain, fetch public branding (no auth needed)
  useEffect(() => {
    if (!subdomain) return
    let cancelled = false
    void (async () => {
      try {
        const data = await fetchPublicTenantBranding(subdomain)
        if (!cancelled) {
          setBranding(data)
          setTenantError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setTenantError(error.message || 'Tenant not found')
        }
      }
    })()
    return () => { cancelled = true }
  }, [subdomain])

  const refresh = useCallback(async () => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    const data = await fetchBrandingByToken()
    setBranding(data)
    return data
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        await refresh()
      } catch {
        if (!cancelled) setBranding(getStoredBranding())
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refresh])

  useEffect(() => {
    const primary = branding?.primary_color || DEFAULT_BRANDING.primary_color
    document.documentElement.style.setProperty('--tenant-primary', primary)
    document.documentElement.style.setProperty('--tenant-primary-soft', hexToRgba(primary, 0.12))
  }, [branding])

  const value = useMemo(
    () => ({
      branding,
      brandingLogoUrl: branding?.logo_url || '',
      tenantName: branding?.business_name || '',
      subdomain,
      tenantError,
      theme,
      themeMode,
      setThemeMode,
      refresh,
      setBranding,
    }),
    [branding, subdomain, tenantError, theme, themeMode, setThemeMode, refresh],
  )

  return <TenantBrandingContext.Provider value={value}>{children}</TenantBrandingContext.Provider>
}

export function useTenantBranding() {
  const ctx = useContext(TenantBrandingContext)
  if (!ctx) {
    const b = getStoredBranding()
    const primary = b?.primary_color || DEFAULT_BRANDING.primary_color
    return {
      branding: b,
      brandingLogoUrl: b?.logo_url || '',
      tenantName: b?.business_name || '',
      subdomain: getSubdomain(),
      tenantError: null,
      theme: {
        accent: primary,
        accentSoft: hexToRgba(primary, 0.12),
      },
      themeMode: 'system',
      setThemeMode: () => {},
      refresh: () => {},
      setBranding: () => {},
    }
  }
  return ctx
}
