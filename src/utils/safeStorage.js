// Some mobile browsers/in-app webviews (restricted third-party storage
// contexts, strict privacy modes, certain embedded browsers) throw a
// SecurityError just from touching `window.localStorage` — not only on
// get/setItem, but on accessing the property itself. Uncaught, that crashes
// the whole app (an unhandled error bubbling into the root error boundary),
// which is what "Something went wrong" + a localStorage stack trace means.
// Every call site in this app goes through these wrappers instead of
// `localStorage` directly, so a blocked/unavailable store degrades to
// "nothing persists" rather than crashing the page.
export function safeGetItem(key) {
  try {
    return globalThis.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSetItem(key, value) {
  try {
    globalThis.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function safeRemoveItem(key) {
  try {
    globalThis.localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

// Same rationale, for sessionStorage call sites.
export function safeSessionGetItem(key) {
  try {
    return globalThis.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSessionSetItem(key, value) {
  try {
    globalThis.sessionStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function safeSessionRemoveItem(key) {
  try {
    globalThis.sessionStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}
