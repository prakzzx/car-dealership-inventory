import { Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import { AdminRoute, ProtectedRoute } from './components/ProtectedRoute';
import AdminPage from './pages/AdminPage';
import CartPage from './pages/CartPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import PaymentPage from './pages/PaymentPage';
import RegisterPage from './pages/RegisterPage';
import VehicleFormPage from './pages/VehicleFormPage';

/** Routes only (the Router is provided by main.tsx / tests) so the tree is easy to render in any state. */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="payment" element={<PaymentPage />} />
          <Route element={<AdminRoute />}>
            <Route path="admin" element={<AdminPage />} />
            <Route path="admin/vehicles/new" element={<VehicleFormPage />} />
            <Route path="admin/vehicles/:id/edit" element={<VehicleFormPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
