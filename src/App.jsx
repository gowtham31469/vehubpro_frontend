import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import AdminCustomers from './pages/AdminCustomers'
import AdminConfiguration from './pages/AdminConfiguration'
import AdminServiceVehicles from './pages/AdminServiceVehicles'
import AdminServiceVehicleForm from './pages/AdminServiceVehicleForm'
import AdminServices from './pages/AdminServices'
import AdminJobCards from './pages/AdminJobCards'
import AdminJobCardEditor from './pages/AdminJobCardEditor'
import AdminInvoices from './pages/AdminInvoices'
import AdminInvoiceDetail from './pages/AdminInvoiceDetail'
import AdminInsights from './pages/AdminInsights'
import AdminUsers from './pages/AdminUsers'
import AdminPortfolio from './pages/AdminPortfolio'
import AdminInventoryVehicles from './pages/AdminInventoryVehicles'
import AdminInventoryVehicleForm from './pages/AdminInventoryVehicleForm'
import PublicPortfolio from './pages/PublicPortfolio'
import { isAuthenticated } from './utils/apiClient'

function RequireAuth() {
  if (!isAuthenticated()) {
    return <Navigate to="/admin" replace />
  }
  return <Outlet />
}

export default function App() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/portfolio" element={<PublicPortfolio />} />
      <Route element={<RequireAuth />}>
        <Route path="/admin/insights" element={<AdminInsights />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/portfolio" element={<AdminPortfolio />} />
        <Route path="/admin/portfolio/inventory" element={<AdminInventoryVehicles />} />
        <Route path="/admin/portfolio/inventory/new" element={<AdminInventoryVehicleForm />} />
        <Route path="/admin/portfolio/inventory/:id/edit" element={<AdminInventoryVehicleForm />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/customers" element={<AdminCustomers />} />
        <Route path="/admin/service-vehicles" element={<AdminServiceVehicles />} />
        <Route path="/admin/service-vehicles/new" element={<AdminServiceVehicleForm />} />
        <Route path="/admin/service-vehicles/:id/edit" element={<AdminServiceVehicleForm />} />
        <Route path="/admin/job-cards" element={<AdminJobCards />} />
        <Route path="/admin/job-cards/new" element={<AdminJobCardEditor />} />
        <Route path="/admin/job-cards/:id" element={<AdminJobCardEditor />} />
        <Route path="/admin/invoices" element={<AdminInvoices />} />
        <Route path="/admin/invoices/:id" element={<AdminInvoiceDetail />} />
        <Route path="/admin/services" element={<AdminServices />} />
        <Route path="/admin/configuration" element={<AdminConfiguration />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}
