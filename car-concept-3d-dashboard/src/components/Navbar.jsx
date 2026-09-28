import { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { clearTokens } from "../api.js";
import { useAuth } from "../auth.jsx";
import { setLanguage, useLanguage } from "../i18n.js";

export default function Navbar() {
  const { language, t } = useLanguage();
  const { status, user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const authenticated = status === "authenticated";
  const links = authenticated
    ? [["/", "home"], ["/cars", "cars"], ["/store", "store"], ["/ai", "aiNav"], ["/profile", "profile"], ["/about", "info"]]
    : [["/", "home"], ["/about", "info"], ["/login", "signIn"], ["/register", "register"]];
  function signOut() { clearTokens(); setMenuOpen(false); navigate("/", { replace: true }); }
  return <header className="site-nav">
    <Link className="wordmark" to="/" onClick={() => setMenuOpen(false)}>AA <span>Auto Anatomy</span></Link>
    <button className="nav-menu-toggle" aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen((value) => !value)}>{menuOpen ? t("close") : t("menu")}</button>
    <nav id="main-navigation" className={menuOpen ? "is-open" : ""} aria-label={t("mainNavigation")}>
      {links.map(([path, label]) => <NavLink key={path} to={path} onClick={() => setMenuOpen(false)}>{t(label)}</NavLink>)}
      {authenticated && user?.is_staff && <NavLink to="/admin" onClick={() => setMenuOpen(false)}>{t("adminNav")}</NavLink>}
      {authenticated && <button className="nav-logout" onClick={signOut}>{t("signOut")}</button>}
    </nav>
    <label className="language-picker"><span>{t("language")}</span><select aria-label={t("language")} value={language} onChange={(event) => setLanguage(event.target.value)}><option value="ru">RU</option><option value="tg">TG</option><option value="en">EN</option></select></label>
  </header>;
}
