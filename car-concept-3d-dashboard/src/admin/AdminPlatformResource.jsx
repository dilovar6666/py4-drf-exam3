import { useState } from "react";
import { useParams } from "react-router-dom";
import { managementApi } from "../api/catalog.js";
import { useApi } from "../hooks/useApi.js";
import { Pagination, SearchInput, StateView } from "../components/UI.jsx";

const titles = { "3d-models": "3D Models", users: "Users", garage: "User Garage", ai: "AI conversations", analytics: "Analytics", tasks: "Background tasks", settings: "Settings" };
const label = (key) => key.replaceAll("__", " / ").replaceAll("_", " ");

export default function AdminPlatformResource() {
  const { resource } = useParams();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const state = useApi(() => managementApi.platformSection(resource), [resource]);
  if (state.loading || state.error) return <StateView {...state} />;
  const section = state.data;
  const entries = section.rows || [];
  const rows = entries.filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase()));
  const pageSize = 20;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const visible = rows.slice((page - 1) * pageSize, page * pageSize);
  return <><header className="admin-heading"><p className="eyebrow">Platform administration</p><h1>{section.title || titles[resource]}</h1><p>Live records from Auto Anatomy. Empty states reflect the current database.</p></header>
    {section.providers && <div className="admin-counts">{Object.entries(section.providers).map(([key, value]) => <div key={key}><span>{label(key)}</span><strong className={value ? "status-good" : "status-off"}>{value ? "Available" : "Unavailable"}</strong></div>)}</div>}
    {section.counts && <div className="admin-counts">{Object.entries(section.counts).map(([key, value]) => <div key={key}><span>{label(key)}</span><strong>{value}</strong></div>)}</div>}
    {section.popular && <div className="admin-data-grid">{Object.entries(section.popular).map(([kind, items]) => <article className="admin-panel" key={kind}><h2>Popular {kind}</h2>{items.length ? items.slice(0,10).map((item) => <p key={item.id}>{item.name} · {item.views}</p>) : <p>No authenticated view activity recorded.</p>}</article>)}</div>}
    {(section.recent_users || section.recent_products || section.recent_cars) && <div className="admin-data-grid">{[["Recent users", section.recent_users], ["Recent products", section.recent_products], ["Recent cars", section.recent_cars]].filter(([, value]) => value).map(([heading, items]) => <article className="admin-panel" key={heading}><h2>{heading}</h2>{items.map((item) => <p key={item.id}>{Object.entries(item).filter(([key]) => !["id", "description"].includes(key)).map(([key, value]) => `${label(key)}: ${value}`).join(" · ")}</p>)}</article>)}</div>}
    {entries.length > 0 && <><SearchInput placeholder="Search records" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /><div className="table-scroll"><table className="admin-table"><thead><tr>{Object.keys(entries[0]).map((key) => <th key={key}>{label(key)}</th>)}</tr></thead><tbody>{visible.map((row, index) => <tr key={row.id || index}>{Object.keys(entries[0]).map((key) => <td key={key}>{String(row[key] ?? "—")}</td>)}</tr>)}</tbody></table></div><div className="admin-pagination"><span>{rows.length} records</span><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>{page} / {pages}</span><button disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button></div></>}
    {!entries.length && !section.counts && !section.providers && !section.popular && <p className="admin-note">No records have been recorded yet.</p>}
  </>;
}
