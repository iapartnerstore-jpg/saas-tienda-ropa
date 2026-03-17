import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import healthRoutes from './modules/health/routes.js';
import authRoutes from './modules/auth/routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';


import productsRoutes from './routes/products.routes.js';
import salesRoutes from './routes/sales.routes.js';
import customersRoutes from './routes/customers.routes.js';
import storeSettingsRoutes from './routes/storeSettings.routes.js';
import providersRoutes from './routes/providers.routes.js';
import promotionsRoutes from './routes/promotions.routes.js';


const app = express();

// CORS: en produccion limitar al dominio real
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : ['*'];

app.use(cors({
  origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
  credentials: true,
}));
app.use(express.json());

// módulos
app.use('/', healthRoutes);
app.use('/auth', authRoutes);
app.use('/reports', reportsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportsRoutes);

// rutas core — /store/settings ANTES de /store para evitar que el router genérico lo intercepte
app.use('/store/settings', storeSettingsRoutes);
app.use('/api/store/settings', storeSettingsRoutes);
app.use('/products', productsRoutes);
app.use('/sales', salesRoutes);
app.use('/customers', customersRoutes);
app.use('/providers', providersRoutes);
app.use('/store/providers', providersRoutes);
app.use('/promotions', promotionsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/providers', providersRoutes);
app.use('/api/store/providers', providersRoutes);
app.use('/api/promotions', promotionsRoutes);

// ── Servir frontend en producción ──────────────────────────────────
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));

// Cualquier ruta que NO sea API → devolver index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});




const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API SaaS Tienda de Ropa escuchando en puerto ${PORT}`);
});
