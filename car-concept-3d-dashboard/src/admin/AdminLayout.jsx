import { useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { api, clearTokens, getAccessToken, setTokens } from "../api.js";
import { useApi } from "../hooks/useApi.js";
import { Button, FormField, StateView } from "../components/UI.jsx";

function AdminLogin({ onAuthenticated }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(null),
    [pending, setPending] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const tokens = await api.login(email, password);
      setTokens(tokens);
      onAuthenticated();
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="page login-page">
      <form className="login-form" onSubmit={submit}>
        <p className="eyebrow">Auto Anatomy / Administration</p>
        <h1>Manage the archive.</h1>
        <p>Sign in with an existing staff account.</p>
        <FormField label="Email">
          <input
            autoFocus
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Password">
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </FormField>
        {error && (
          <p role="alert" className="error-text">
            {error.message}
          </p>
        )}
        <Button disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </main>
  );
}
export default function AdminLayout() {
  const [revision, setRevision] = useState(0);
  const state = useApi(
    () => (getAccessToken() ? api.profile() : null),
    [revision],
  );
  const logout = () => {
    clearTokens();
    setRevision((n) => n + 1);
  };
  if (state.loading)
    return (
      <main className="page">
        <StateView loading />
      </main>
    );
  if (
    !getAccessToken() ||
    state.error?.status === 401 ||
    (!state.data && !state.error)
  )
    return <AdminLogin onAuthenticated={() => setRevision((n) => n + 1)} />;
  if (state.error)
    return (
      <main className="page">
        <StateView {...state} />
      </main>
    );
  if (!state.data.is_staff)
    return (
      <main className="page">
        <StateView empty="This account does not have staff access." />
        <Button onClick={logout} secondary>
          Sign out
        </Button>
      </main>
    );
  return (
    <div className="admin-layout">
      <aside className="admin-nav">
        <p className="eyebrow">Archive management</p>
        <nav aria-label="Admin navigation">
          {[
            ["", "Overview"],
            ["cars", "Cars"],
            ["3d-models", "3D Models"],
            ["components", "Car Parts"],
            ["products", "Products"],
            ["compatibility", "Compatibility"],
            ["users", "Users"],
            ["garage", "User Garage"],
            ["ai", "AI"],
            ["3d-import", "3D Import"],
            ["analytics", "Analytics"],
            ["tasks", "Background Tasks"],
            ["settings", "Settings"],
          ].map(([path, title]) => (
            <NavLink key={path} end to={`/admin${path ? `/${path}` : ""}`}>
              {title}
            </NavLink>
          ))}
          <details>
            <summary>Related data</summary>
            {[
              ["models", "Vehicle models"],
              ["brands", "Car manufacturers"],
              ["specifications", "Specifications"],
              ["images", "Product images"],
              ["component-categories", "Component categories"],
              ["product-brands", "Product manufacturers"],
              ["product-categories", "Product categories"],
            ].map(([path, title]) => (
              <NavLink key={path} to={`/admin/${path}`}>
                {title}
              </NavLink>
            ))}
          </details>
        </nav>
        <div className="admin-session">
          <span>{state.data.email}</span>
          <button className="text-link" onClick={logout}>
            Sign out
          </button>
          <Link className="text-link" to="/">
            Return to public site ↗
          </Link>
        </div>
      </aside>
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}
