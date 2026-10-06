import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AppShell } from './components/layout/AppShell'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import SupplyDashboard from './pages/SupplyDashboard'
import RetailDashboard from './pages/RetailDashboard'
import FollowUpsPage from './pages/FollowUpsPage'
import PartiesPage from './pages/PartiesPage'
import InvoicesPage from './pages/InvoicesPage'
import RecordPaymentPage from './pages/RecordPaymentPage'
import PaymentsListPage from './pages/PaymentsListPage'
import ImportPage from './pages/ImportPage'
import PromisesPage from './pages/PromisesPage'
import RetailSalesPage from './pages/RetailSalesPage'
import RetailPayPage from './pages/RetailPayPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<SupplyDashboard />} />
          <Route path="parties" element={<PartiesPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="payments" element={<PaymentsListPage />} />
          <Route path="payments/new" element={<RecordPaymentPage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="followups" element={<FollowUpsPage />} />
          <Route path="promises" element={<PromisesPage />} />
          <Route path="retail" element={<RetailDashboard />} />
          <Route path="retail-sales" element={<RetailSalesPage />} />
          <Route path="retail-pay" element={<RetailPayPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
