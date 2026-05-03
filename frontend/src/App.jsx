import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage from './pages/LoginPage';
import SuperAdminLayout from './pages/superadmin/SuperAdminLayout';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import MenuPage from './pages/admin/MenuPage';
import TablesPage from './pages/admin/TablesPage';
import ReservationsPage from './pages/admin/ReservationsPage';
import UsersPage from './pages/admin/UsersPage';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import OrdersPage from './pages/admin/OrdersPage';
import FloorPlanPage from './pages/admin/FloorPlanPage';
import ShiftSummaryPage from './pages/admin/ShiftSummaryPage';
import StaffLayout from './pages/staff/StaffLayout';
import StaffOrders from './pages/staff/StaffOrders';
import StaffReservations from './pages/staff/StaffReservations';
import KitchenPanel from './pages/KitchenPanel';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
};

const RoleRouter = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  switch (user.role?.toLowerCase()) {
    case 'super_admin': return <Navigate to="/super-admin" />;
    case 'admin':       return <Navigate to="/admin" />;
    case 'staff':       return <Navigate to="/staff" />;
    case 'kitchen':     return <Navigate to="/kitchen" />;
    default:            return <Navigate to="/login" />;
  }
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          style: { background: '#1a1a2e', color: '#e2e8f0', border: '1px solid #334155' }
        }} />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RoleRouter />} />

          <Route path="/super-admin" element={
            <ProtectedRoute roles={['super_admin']}><SuperAdminLayout /></ProtectedRoute>
          }>
            <Route index element={<SuperAdminDashboard />} />
          </Route>

          <Route path="/admin" element={
            <ProtectedRoute roles={['admin', 'super_admin']}><AdminLayout /></ProtectedRoute>
          }>
            <Route index          element={<AdminDashboard />} />
            <Route path="menu"         element={<MenuPage />} />
            <Route path="tables"       element={<TablesPage />} />
            <Route path="orders"       element={<OrdersPage />} />
            <Route path="take-order"   element={<StaffOrders />} />
            <Route path="shift"        element={<ShiftSummaryPage />} />
            <Route path="shift"        element={<ShiftSummaryPage />} />
            <Route path="users"        element={<UsersPage />} />
            <Route path="analytics"    element={<AnalyticsPage />} />
          </Route>

          <Route path="/staff" element={
            <ProtectedRoute roles={['staff', 'admin']}><StaffLayout /></ProtectedRoute>
          }>
            <Route index element={<StaffOrders />} />
            <Route path="tables" element={<TablesPage />} />
          </Route>

          <Route path="/kitchen" element={
            <ProtectedRoute roles={['kitchen', 'admin']}><KitchenPanel /></ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
