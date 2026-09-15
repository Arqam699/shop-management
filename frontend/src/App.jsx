import React, { lazy, Suspense } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

// Load page code only when its route is opened. This keeps the first app
// download small instead of making every screen wait for every other screen.
const Login = lazy(() => import('./pages/Login'));
const SuperAdminLogin = lazy(() => import('./pages/SuperAdminLogin'));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AiAssistant = lazy(() => import('./pages/AiAssistant')); // <-- NAYA ASSISTANT PAGE IMPORT
const SettingsPage = lazy(() => import('./pages/Settings'));
const Inventory = lazy(() => import('./pages/Inventory'));
const AddEditProduct = lazy(() => import('./pages/AddEditProduct'));
const Customers = lazy(() => import('./pages/Customers'));
const AddEditCustomer = lazy(() => import('./pages/AddEditCustomer'));
const CustomerProfile = lazy(() => import('./pages/CustomerProfile'));
const CustomerDetails = lazy(() => import('./pages/CustomerDetails'));
const CustomerLedger = lazy(() => import('./pages/CustomerLedger'));
const Sales = lazy(() => import('./pages/Sales'));
const NewSale = lazy(() => import('./pages/NewSale'));
const EditSale = lazy(() => import('./pages/EditSale'));
const Installments = lazy(() => import('./pages/Installments'));
const InstallmentPlanDetails = lazy(() => import('./pages/InstallmentPlanDetails'));
const PlaceholderPage = lazy(() => import('./pages/PlaceholderPage'));
const Returns = lazy(() => import('./pages/Returns'));
const Payments = lazy(() => import('./pages/Payments'));
const Invoices = lazy(() => import('./pages/Invoices'));
const InvoiceDetails = lazy(() => import('./pages/InvoiceDetails'));
const YearlyAudits = lazy(() => import('./pages/YearlyAudits'));
const YearlyAuditDetail = lazy(() => import('./pages/YearlyAuditDetail'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Reports = lazy(() => import('./pages/Reports'));
const DueDates = lazy(() => import('./pages/DueDates'));


function App() {
  return (
    <AuthProvider>
      <SettingsProvider>

        <Toaster
          position="top-right"
          reverseOrder={false}
        />

        <Router>
          <Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm font-semibold text-slate-500">
                Loading page...
              </div>
            }
          >
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
                SHOP ASSISTANT ROUTING (✨ NAYA ROUTE)
                ===================================================== */}

            <Route
              path="/assistant"
              element={
                <ProtectedRoute>
                  <Layout>
                    <AiAssistant />
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

            {/* Customer List */}

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


            {/* Customer Register */}

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


            {/* Edit Customer */}

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


            {/* =====================================================
                CUSTOMER DETAILS
                ===================================================== */}

            <Route
              path="/customers/details"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CustomerDetails />
                  </Layout>
                </ProtectedRoute>
              }
            />


            {/* =====================================================
                COMPLETE CUSTOMER LEDGER
                ===================================================== */}

            <Route
              path="/customers/ledger"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CustomerLedger />
                  </Layout>
                </ProtectedRoute>
              }
            />


            {/* =====================================================
                CUSTOMER PROFILE
                IMPORTANT:
                Keep after static customer routes.
                ===================================================== */}

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
          </Suspense>
        </Router>

      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;