import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api, setTokens } from "../api.js";
import { Button, FormField } from "../components/UI.jsx";
import { useLanguage } from "../i18n.js";

export default function AuthPage({ register = false }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [verify, setVerify] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const navigate = useNavigate(), location = useLocation();
  const { t } = useLanguage();
  async function submit(event) {
    event.preventDefault(); setPending(true); setNotice("");
    try {
      if (verify) { await api.verifyEmail(email, code); setNotice(t("accountVerified")); setVerify(false); }
      else if (register) { const result = await api.register(email, password); setNotice(result.message || t("checkEmail")); setVerify(true); }
      else {
        setTokens(await api.login(email, password));
        const from = location.state?.from;
        navigate(typeof from === "string" && from.startsWith("/") && !from.startsWith("//") ? from : "/cars", { replace: true });
      }
    } catch (error) { setNotice(error.message); }
    finally { setPending(false); }
  }
  return <main className="page profile-page"><header className="page-heading"><p className="eyebrow">Auto Anatomy</p><h1>{verify ? t("verifyEmail") : register ? t("register") : t("signIn")}</h1><p>{t("signInDescription")}</p></header>
    <form className="profile-form" onSubmit={submit}><FormField label={t("email")}><input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></FormField>
      {!verify && <FormField label={t("password")}><input type="password" autoComplete={register ? "new-password" : "current-password"} minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} /></FormField>}
      {verify && <FormField label={t("verificationCode")}><input inputMode="numeric" pattern="[0-9]{6}" required value={code} onChange={(e) => setCode(e.target.value)} /></FormField>}
      {notice && <p role="status">{notice}</p>}<Button disabled={pending}>{pending ? t("loading") : verify ? t("verifyEmail") : register ? t("register") : t("signIn")}</Button>
      <p>{register ? <Link to="/login" state={location.state}>{t("signIn")}</Link> : <Link to="/register" state={location.state}>{t("register")}</Link>}</p></form></main>;
}
