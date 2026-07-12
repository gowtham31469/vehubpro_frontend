import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { TenantBrandingProvider } from './context/TenantBrandingContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <TenantBrandingProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </TenantBrandingProvider>
    </BrowserRouter>
  </StrictMode>,
)
