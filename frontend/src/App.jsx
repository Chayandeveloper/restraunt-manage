import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { lazy, Suspense } from 'react';

// Lazy load components
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SuperAdminLayout = lazy(() => import('./pages/superadmin/SuperAdminLayout'));
const SuperAdminDashboard = lazy(() => import('./pages/superadmin/SuperAdminDashboard'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const MenuPage = lazy(() => import('./pages/admin/MenuPage'));
const TablesPage = lazy(() => import('./pages/admin/TablesPage'));
const ReservationsPage = lazy(() => import('./pages/admin/ReservationsPage'));
const UsersPage = lazy(() => import('./pages/admin/UsersPage'));
const AnalyticsPage = lazy(() => import('./pages/admin/AnalyticsPage'));
const OrdersPage = lazy(() => import('./pages/admin/OrdersPage'));
const FloorPlanPage = lazy(() => import('./pages/admin/FloorPlanPage'));
const ShiftSummaryPage = lazy(() => import('./pages/admin/ShiftSummaryPage'));
const StaffLayout = lazy(() => import('./pages/staff/StaffLayout'));
const StaffOrders = lazy(() => import('./pages/staff/StaffOrders'));
const StaffReservations = lazy(() => import('./pages/staff/StaffReservations'));
const KitchenPanel = lazy(() => import('./pages/KitchenPanel'));

const PageLoader = () => (
  <div style={{ 
    height: '100vh', 
    width: '100%', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    background: '#0c0e14'
  }}>
    <div className="spinner" />
  </div>
);

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
        <Suspense fallback={<PageLoader />}>
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
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
