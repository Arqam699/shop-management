
import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

import Login from './pages/Login';
import SuperAdminLogin from './pages/SuperAdminLogin';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import Dashboard from './pages/Dashboard';
import SettingsPage from './pages/Settings';

import Inventory from './pages/Inventory';
import AddEditProduct from './pages/AddEditProduct';

import Customers from './pages/Customers';
import AddEditCustomer from './pages/AddEditCustomer';
import CustomerProfile from './pages/CustomerProfile';

import Sales from './pages/Sales';
import NewSale from './pages/NewSale';
import EditSale from './pages/EditSale';

import Installments from './pages/Installments';
import InstallmentPlanDetails from './pages/InstallmentPlanDetails';

import PlaceholderPage from './pages/PlaceholderPage';

import Returns from './pages/Returns';
import Payments from './pages/Payments';

import Invoices from './pages/Invoices';
import InvoiceDetails from './pages/InvoiceDetails';

import YearlyAudits from './pages/YearlyAudits';
import YearlyAuditDetail from './pages/YearlyAuditDetail';

import Expenses from './pages/Expenses';
import Reports from './pages/Reports';


import DueDates from './pages/DueDates';


function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <Router>
          <Routes>

            {/* =====================================================
                NORMAL ADMIN LOGIN
                ===================================================== */}
            <Route
              path="/login"
              element={<Login />}
            />


            {/* =====================================================
                SUPER ADMIN LOGIN
                ===================================================== */}
            <Route
              path="/super-admin/login"
              element={<SuperAdminLogin />}
            />

            {/* =====================================================
    SUPER ADMIN DASHBOARD
    ===================================================== */}

<Route
  path="/super-admin/dashboard"
  element={<SuperAdminDashboard />}
/>


            {/* =====================================================
                DASHBOARD ROUTING
                ===================================================== */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />


            {/* =====================================================
                DUE DATES ROUTING
                ===================================================== */}
            <Route
              path="/due-dates"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DueDates />
                  </Layout>
                </ProtectedRoute>
              }
            />


            {/* =====================================================
                INVENTORY ROUTING
                ===================================================== */}
            <Route
              path="/inventory"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Inventory />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/inventory/add"
              element={
                <ProtectedRoute>
                  <Layout>
                    <AddEditProduct />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/inventory/edit/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <AddEditProduct />
                  </Layout>
                </ProtectedRoute>
              }
            />


            {/* =====================================================
                CUSTOMERS ROUTING
                ===================================================== */}
            <Route
              path="/customers"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Customers />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/customers/add"
              element={
                <ProtectedRoute>
                  <Layout>
                    <AddEditCustomer />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/customers/edit/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <AddEditCustomer />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/customers/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CustomerProfile />
                  </Layout>
                </ProtectedRoute>
              }
            />


            {/* =====================================================
                SALES ROUTING
                ===================================================== */}
            <Route
              path="/sales"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Sales />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/sales/new"
              element={
                <ProtectedRoute>
                  <Layout>
                    <NewSale />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/sales/edit/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <EditSale />
                  </Layout>
                </ProtectedRoute>
              }
            />


            {/* =====================================================
                SETTINGS ROUTING
                ===================================================== */}
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Layout>
                    <SettingsPage />
                  </Layout>
                </ProtectedRoute>
              }
            />


            {/* =====================================================
                INSTALLMENTS ROUTING
                ===================================================== */}
            <Route
              path="/installments"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Installments />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/installments/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <InstallmentPlanDetails />
                  </Layout>
                </ProtectedRoute>
              }
            />


            {/* =====================================================
                PAYMENTS HISTORY ROUTING
                ===================================================== */}
            <Route
              path="/payments"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Payments />
                  </Layout>
                </ProtectedRoute>
              }
            />


            {/* =====================================================
                INVOICES ROUTING
                ===================================================== */}
            <Route
              path="/invoices"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Invoices />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/invoices/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <InvoiceDetails />
                  </Layout>
                </ProtectedRoute>
              }
            />


            {/* =====================================================
                RETURNS ROUTING
                ===================================================== */}
            <Route
              path="/returns"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Returns />
                  </Layout>
                </ProtectedRoute>
              }
            />


            {/* =====================================================
                EXPENSES ROUTING
                ===================================================== */}
            <Route
              path="/expenses"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Expenses />
                  </Layout>
                </ProtectedRoute>
              }
            />


            {/* =====================================================
                REPORTS ROUTING
                ===================================================== */}
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Reports />
                  </Layout>
                </ProtectedRoute>
              }
            />


            {/* =====================================================
                YEARLY AUDITS
                ===================================================== */}
            <Route
              path="/audits"
              element={
                <ProtectedRoute>
                  <Layout>
                    <YearlyAudits />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/audits/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <YearlyAuditDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />


            {/* =====================================================
                DEFAULT ROUTE
                ===================================================== */}
            <Route
              path="/"
              element={
                <Navigate
                  to="/dashboard"
                  replace
                />
              }
            />


            {/* =====================================================
                404 / UNKNOWN ROUTES
                ===================================================== */}
            <Route
              path="*"
              element={
                <Navigate
                  to="/dashboard"
                  replace
                />
              }
            />

          </Routes>
        </Router>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
