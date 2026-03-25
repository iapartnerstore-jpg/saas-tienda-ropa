import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { StoreSettingsProvider } from './context/StoreSettingsContext'
import Layout from './components/layout/Layout'
import Login from './modules/auth/Login'
import Dashboard from './modules/dashboard/Dashboard'
import PosPage from './modules/pos/PosPage'
import ProductsPage from "./modules/products/ProductsPage"
import ClientsPage from "./modules/customers/ClientsPage"
import ReportsPage from "./modules/reports/ReportsPage"
import CashRegisterPage from './arqueo/CashRegisterPage'
import ProvidersPage from './modules/providers/ProvidersPage'
import PromotionsPage from './modules/promotions/PromotionsPage'
import UsersPage from './modules/users/UsersPage'
import { isLoggedIn, isAdmin, hasPermission } from './utils/auth'

function ProtectedRoute({ children }) {
  return isLoggedIn() ? children : <Navigate to="/" replace />
}

function AdminOnlyRoute({ children }) {
  if (!isLoggedIn()) return <Navigate to="/" replace />
  return isAdmin() ? children : <Navigate to="/dashboard" replace />
}

function PermissionRoute({ module, children }) {
  if (!isLoggedIn()) return <Navigate to="/" replace />
  return hasPermission(module) ? children : <Navigate to="/dashboard" replace />
}

function App() {
  return (
    <StoreSettingsProvider>
      <Routes>
        <Route path="/" element={<Login />} />
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
        <Route
          path="/pos"
          element={
            <PermissionRoute module="pos">
              <Layout>
                <PosPage />
              </Layout>
            </PermissionRoute>
          }
        />
        <Route
          path="/productos"
          element={
            <PermissionRoute module="productos">
              <Layout>
                <ProductsPage />
              </Layout>
            </PermissionRoute>
          }
        />
        <Route
          path="/clientes"
          element={
            <PermissionRoute module="clientes">
              <Layout>
                <ClientsPage />
              </Layout>
            </PermissionRoute>
          }
        />
        <Route
          path="/proveedores"
          element={
            <PermissionRoute module="proveedores">
              <Layout>
                <ProvidersPage />
              </Layout>
            </PermissionRoute>
          }
        />
        <Route
          path="/promociones"
          element={
            <PermissionRoute module="promociones">
              <Layout>
                <PromotionsPage />
              </Layout>
            </PermissionRoute>
          }
        />
        <Route
          path="/reportes"
          element={
            <PermissionRoute module="reportes">
              <Layout>
                <ReportsPage />
              </Layout>
            </PermissionRoute>
          }
        />
        <Route
          path="/arqueo"
          element={
            <PermissionRoute module="arqueo">
              <Layout>
                <CashRegisterPage />
              </Layout>
            </PermissionRoute>
          }
        />
        <Route
          path="/usuarios"
          element={
            <AdminOnlyRoute>
              <Layout>
                <UsersPage />
              </Layout>
            </AdminOnlyRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </StoreSettingsProvider>
  )
}

export default App
