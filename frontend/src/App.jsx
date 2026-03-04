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
import { isLoggedIn, useRole } from './utils/auth'
import ProvidersPage from './modules/providers/ProvidersPage'
import PromotionsPage from './modules/promotions/PromotionsPage'

function ProtectedRoute({ children }) {
  return isLoggedIn() ? children : <Navigate to="/" replace />
}

function AdminOnlyRoute({ children }) {
  const { admin } = useRole()
  if (!isLoggedIn()) return <Navigate to="/" replace />
  return admin ? children : <Navigate to="/dashboard" replace />
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
            <ProtectedRoute>
              <Layout>
                <PosPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/productos"
          element={
            <ProtectedRoute>
              <Layout>
                <ProductsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/clientes"
          element={
            <ProtectedRoute>
              <Layout>
                <ClientsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/proveedores"
          element={
            <ProtectedRoute>
              <Layout>
                <ProvidersPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/promociones"
          element={
            <ProtectedRoute>
              <Layout>
                <PromotionsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reportes"
          element={
            <AdminOnlyRoute>
              <Layout>
                <ReportsPage />
              </Layout>
            </AdminOnlyRoute>
          }
        />

        <Route
          path="/arqueo"
          element={
            <ProtectedRoute>
              <Layout>
                <CashRegisterPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </StoreSettingsProvider>
  )
}

export default App
