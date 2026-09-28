import { useEffect } from "react";
import { Routes, Route, useLocation, Link, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import HomePage from "./pages/HomePage.jsx";
import CarsPage from "./pages/CarsPage.jsx";
import VehiclePage from "./pages/VehiclePage.jsx";
import PartsPage from "./pages/PartsPage.jsx";
import ProductPage from "./pages/ProductPage.jsx";
import AboutPage from "./pages/AboutPage.jsx";
import StorePage from "./pages/StorePage.jsx";
import StoreProductPage from "./pages/StoreProductPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import AIAssistant from "./components/AIAssistant.jsx";
import AdminLayout from "./admin/AdminLayout.jsx";
import AdminOverview from "./admin/AdminOverview.jsx";
import AdminResource from "./admin/AdminResource.jsx";
import Admin3DImport from "./admin/Admin3DImport.jsx";
import { StateView, Button } from "./components/UI.jsx";
import { AuthProvider, ProtectedRoute } from "./auth.jsx";
import { useLanguage } from "./i18n.js";

function Footer() {
  const { t } = useLanguage();
  return <footer className="site-footer"><span>© {new Date().getFullYear()} Auto Anatomy · {t("footerTagline")}</span><nav aria-label={t("footerNavigation")}><Link to="/">{t("home")}</Link><Link to="/about">{t("info")}</Link></nav></footer>;
}

function AppLayout({ children }) {
  const location = useLocation();
  const { t } = useLanguage();
  useEffect(() => { window.scrollTo(0, 0); document.title = `Auto Anatomy — ${t("understand")}`; }, [location.pathname]);
  return <><a className="skip-link" href="#main-content">{t("skipContent")}</a><Navbar /><div id="main-content">{children}</div><Footer /></>;
}

const privatePage = (element) => <ProtectedRoute>{element}</ProtectedRoute>;

function AppRoutes() {
  return <Routes>
    <Route path="/admin" element={<ProtectedRoute staff><AdminLayout /></ProtectedRoute>}>
      <Route index element={<AdminOverview />} />
      <Route path="3d-import" element={<Admin3DImport />} />
      <Route path=":resource" element={<AdminResource />} />
    </Route>
    <Route path="*" element={<AppLayout><Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/info" element={<Navigate to="/about" replace />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage register />} />
      <Route path="/cars" element={privatePage(<CarsPage />)} />
      <Route path="/cars/:carId" element={privatePage(<VehiclePage />)} />
      <Route path="/cars/:carId/components/:componentId" element={privatePage(<VehiclePage />)} />
      <Route path="/parts" element={privatePage(<PartsPage />)} />
      <Route path="/parts/:productId" element={privatePage(<ProductPage />)} />
      <Route path="/store" element={privatePage(<StorePage />)} />
      <Route path="/store/products/:productId" element={privatePage(<StoreProductPage />)} />
      <Route path="/profile" element={privatePage(<ProfilePage />)} />
      <Route path="/profile/garage/:garageId" element={privatePage(<ProfilePage />)} />
      <Route path="/ai" element={privatePage(<main className="page ai-page"><AIAssistant defaultOpen /></main>)} />
      <Route path="*" element={<main className="page"><StateView empty="This page does not exist." /><Button to="/">Return home</Button></main>} />
    </Routes></AppLayout>} />
  </Routes>;
}

export default function App() { return <AuthProvider><AppRoutes /></AuthProvider>; }
