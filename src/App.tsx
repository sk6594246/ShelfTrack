import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Scan } from './pages/Scan';
import { ProductDetail } from './pages/ProductDetail';
import { ProductForm } from './pages/ProductForm';
import { Settings } from './pages/settings/Settings';
import { QRMapping } from './pages/settings/QRMapping';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="scan" element={<Scan />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/:id" element={<ProductDetail />} />
          <Route path="products/:id/edit" element={<ProductForm />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/qr-mapping" element={<QRMapping />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
