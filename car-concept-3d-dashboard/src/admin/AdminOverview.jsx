import { Link } from "react-router-dom";
import { managementApi } from "../api/catalog.js";
import { useApi } from "../hooks/useApi.js";
import { StateView } from "../components/UI.jsx";
import { useState } from "react";
export default function AdminOverview() {
  const state = useApi(managementApi.overview);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  async function generateProducts() {
    if (!window.confirm("Create draft product records for CarParts that do not already have a product?")) return;
    setPending(true); setNotice("");
    try {
      const result = await managementApi.generateProducts();
      setNotice(`${result.created} draft products created; ${result.skipped_existing} already existed.`);
      state.retry();
    } catch (error) { setNotice(error.message); }
    finally { setPending(false); }
  }
  return (
    <>
      <header className="admin-heading">
        <p className="eyebrow">Overview</p>
        <h1>Your automotive archive.</h1>
        <p>
          Manage vehicles, semantic components and recorded product
          compatibility.
        </p>
      </header>
      {state.loading || state.error ? (
        <StateView {...state} />
      ) : (
        <div className="admin-counts">
          {Object.entries(state.data.counts).map(([name, count]) => {
            const route = { cars: "cars", three_d_cars: "3d-models", components: "components", products: "products", compatibility: "compatibility", users: "users", garage_cars: "garage", ai_messages: "ai", draft_products: "products" }[name];
            const card = <><span>{name.replaceAll("_", " ")}</span><strong>{count}</strong></>;
            return route ? <Link key={name} to={`/admin/${route}`}>{card}</Link> : <div key={name}>{card}</div>;
          })}
        </div>
      )}
      {!state.loading && !state.error && <>
        <section className="admin-panel admin-generator"><div><p className="eyebrow">Catalog automation</p><h2>Generate Products from Car Parts</h2><p>Creates draft catalog entries for existing components. No manufacturer, OEM number, or price is invented.</p>{notice && <p role="status">{notice}</p>}</div><button disabled={pending} onClick={generateProducts}>{pending ? "Generating…" : "Generate draft products"}</button></section>
        <div className="admin-data-grid">{[["Recent users", state.data.recent_users, (row) => `${row.username} · ${row.email}`], ["Recent products", state.data.recent_products, (row) => `${row.name}${row.is_draft ? " · DRAFT" : ""}`], ["Recent cars", state.data.recent_cars, (row) => `${row["car_model__brand__name"]} ${row["car_model__name"]} · ${row.year}`]].map(([title, rows, label]) => <section className="admin-panel" key={title}><h2>{title}</h2>{rows.length ? rows.map((row) => <p key={row.id}>{label(row)}</p>) : <p>No records yet.</p>}</section>)}</div>
        <div className="admin-data-grid">{Object.entries(state.data.popular).map(([title, rows]) => <section className="admin-panel" key={title}><h2>Popular {title}</h2>{rows.length ? rows.slice(0,5).map((row) => <p key={row.id}>{row.name} · {row.views} views</p>) : <p>No signed-in viewing activity has been recorded.</p>}</section>)}</div>
      </>}
      <p className="admin-note">
        Vehicle names and manufacturers are managed through their model and
        brand relations. Product pricing is not part of the current catalog
        schema.
      </p>
    </>
  );
}
