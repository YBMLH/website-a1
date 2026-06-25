import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';

import Home from './pages/public/Home';
import Products from './pages/public/Products';
import ProductDetail from './pages/public/ProductDetail';
import Services from './pages/public/Services';
import ServiceDetail from './pages/public/ServiceDetail';
import Cities from './pages/public/Cities';
import CityDetail from './pages/public/CityDetail';
import About from './pages/public/About';
import Contact from './pages/public/Contact';
import NotFound from './pages/public/NotFound';

import Login from './pages/admin/Login';
import Dashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminServices from './pages/admin/AdminServices';
import AdminCategories from './pages/admin/AdminCategories';
import AdminCities from './pages/admin/AdminCities';
import AdminRegions from './pages/admin/AdminRegions';
import AdminSections from './pages/admin/AdminSections';
import AdminMedia from './pages/admin/AdminMedia';
import AdminInquiries from './pages/admin/AdminInquiries';
import AdminSettings from './pages/admin/AdminSettings';
import AdminAudit from './pages/admin/AdminAudit';
import AdminBackup from './pages/admin/AdminBackup';
import AdminAccount from './pages/admin/AdminAccount';

function RequireAuth({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <div className="page-loading">Loading…</div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public site */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:slug" element={<ProductDetail />} />
        <Route path="/services" element={<Services />} />
        <Route path="/services/:slug" element={<ServiceDetail />} />
        <Route path="/cities" element={<Cities />} />
        <Route path="/cities/:id" element={<CityDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Admin */}
      <Route path="/admin/login" element={<Login />} />
      <Route
        path="/admin"
        element={<RequireAuth><AdminLayout /></RequireAuth>}
      >
        <Route index element={<Dashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="services" element={<AdminServices />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="cities" element={<AdminCities />} />
        <Route path="regions" element={<AdminRegions />} />
        <Route path="sections" element={<AdminSections />} />
        <Route path="media" element={<AdminMedia />} />
        <Route path="inquiries" element={<AdminInquiries />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="audit" element={<AdminAudit />} />
        <Route path="backup" element={<AdminBackup />} />
        <Route path="account" element={<AdminAccount />} />
      </Route>
    </Routes>
  );
}
