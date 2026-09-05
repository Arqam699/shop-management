import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import Login from './pages/Login';
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
import YearlyAudits from './pages/YearlyAudits'; // Import directory page
import YearlyAuditDetail from './pages/YearlyAuditDetail'; // Import detail page

// Import New Expenses & Reports Pages
import Expenses from './pages/Expenses'; 
import Reports from './pages/Reports';

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Dashboard Routing */}
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

            {/* Inventory Routing */}
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

            {/* Customers Routing */}
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

            {/* Sales Routing */}
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
            
            {/* Settings Routing */}
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

            {/* Installments Routing */}
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

            {/* Payments History Routing */}
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

            {/* Invoices Routing */}
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
            
            {/* Returns Routing */}
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

            {/* Expenses Routing */}
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

            {/* Reports Routing */}
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
            {/* Yearly Audits */}
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

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;