import { useEffect, useMemo, useState } from "react";
import { managementApi } from "../api/catalog.js";
import { useApi } from "../hooks/useApi.js";
import { Button, FormField, StateView } from "../components/UI.jsx";
import ThreeScene from "../components/ThreeScene.jsx";

const CATEGORIES = ["BODY", "GLASS", "LIGHTING", "WHEELS", "BRAKES", "ENGINE", "DRIVETRAIN", "SUSPENSION", "INTERIOR", "CHASSIS", "EXHAUST", "UNKNOWN"];
const ACTIVE = new Set(["QUEUED", "ANALYZING", "DECOMPOSING", "CLASSIFYING", "EXPORTING", "VALIDATING", "CREATING_DATABASE_RECORDS"]);

export default function Admin3DImport() {
  const [revision, setRevision] = useState(0), [selected, setSelected] = useState(null), [pending, setPending] = useState(false), [notice, setNotice] = useState("");
  const [source, setSource] = useState(null), [rows, setRows] = useState([]);
  const [metadata, setMetadata] = useState({ brand: "", model: "", year: "", generation: "", description: "", specifications: "{}" });
  const jobs = useApi(managementApi.imports, [revision]);
  const job = useApi(() => selected ? managementApi.importJob(selected) : null, [selected, revision]);
  useEffect(() => { setRows(job.data?.review_manifest || []); }, [job.data?.id, job.data?.status, job.data?.review_manifest]);
  useEffect(() => { if (!ACTIVE.has(job.data?.status)) return; const timer = setTimeout(() => setRevision((value) => value + 1), 3000); return () => clearTimeout(timer); }, [job.data?.status, revision]);
  const previewConfig = useMemo(() => ({ id: `import-${job.data?.id}`, normalization: { targetSize: 3.5, center: [0, 0.2, 0] }, components: Object.fromEntries(rows.filter((row) => !row.disabled).map((row) => [row.component_id, { displayName: row.name, category: row.category, nodes: row.source_nodes, explode: { directionMode: "radial", distanceFactor: 0.08 } }])) }), [job.data?.id, rows]);

  async function submit(event) {
    event.preventDefault(); setPending(true); setNotice("");
    try {
      const specifications = JSON.parse(metadata.specifications || "{}");
      if (!specifications || Array.isArray(specifications) || typeof specifications !== "object") throw new Error("Specifications must be a JSON object.");
      const form = new FormData(); form.append("source_file", source);
      ["brand", "model", "year", "generation", "description"].forEach((key) => form.append(key, metadata[key]));
      form.append("specifications", JSON.stringify(specifications));
      const result = await managementApi.createImport(form);
      setSelected(result.id); setRevision((value) => value + 1); setNotice(result.error_message || "Import submitted to the background queue.");
    } catch (error) { setNotice(error.message); } finally { setPending(false); }
  }
  async function saveReview() { setPending(true); try { await managementApi.reviewImport(job.data.id, rows); setRevision((value) => value + 1); setNotice("Component review saved."); } catch (error) { setNotice(error.message); } finally { setPending(false); } }
  async function publish() { if (!window.confirm("Publish the reviewed car to the public catalog?")) return; setPending(true); try { const result = await managementApi.publishImport(job.data.id); setRevision((value) => value + 1); setNotice(result.error_message || "Reviewed export queued."); } catch (error) { setNotice(error.message); } finally { setPending(false); } }
  async function retry() { setPending(true); try { const result = await managementApi.retryImport(job.data.id); setRevision((value) => value + 1); setNotice(result.error_message || "Retry queued."); } catch (error) { setNotice(error.message); } finally { setPending(false); } }
  function edit(index, key, value) { setRows((old) => old.map((row, i) => i === index ? { ...row, [key]: key === "component_id" ? value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") : value } : row)); }

  return <><header className="admin-heading"><p className="eyebrow">Admin / Pipeline</p><h1>Automated 3D import</h1><p>Upload is staff-only. The reusable Blender pipeline inventories the scene, separates disconnected geometry, and requires human review before publication.</p></header>
    <div className="admin-import-layout"><section className="admin-panel"><h2>New import</h2><form className="profile-form" onSubmit={submit}>
      <FormField label="Source (.blend, .glb, .gltf, .fbx)"><input required type="file" accept=".blend,.glb,.gltf,.fbx" onChange={(event) => setSource(event.target.files[0])} /></FormField>
      {[["brand", "Brand"], ["model", "Model"], ["year", "Year"], ["generation", "Generation / trim"]].map(([key, label]) => <FormField key={key} label={label}><input required={key !== "generation"} type={key === "year" ? "number" : "text"} value={metadata[key]} onChange={(event) => setMetadata({ ...metadata, [key]: event.target.value })} /></FormField>)}
      <FormField label="Description"><textarea value={metadata.description} onChange={(event) => setMetadata({ ...metadata, description: event.target.value })} /></FormField><FormField label="Verified specifications (JSON)"><textarea value={metadata.specifications} onChange={(event) => setMetadata({ ...metadata, specifications: event.target.value })} /></FormField>
      <Button disabled={pending || !source}>{pending ? "Working…" : "Start analysis"}</Button></form>
      <h2>Import jobs</h2>{jobs.loading || jobs.error ? <StateView {...jobs} /> : jobs.data.length ? jobs.data.map((item) => <button className="import-job-row" key={item.id} onClick={() => setSelected(item.id)}><span>{item.brand} {item.model}</span><b>{item.status}</b><progress value={item.progress} max="100" />{item.error_message && <small>{item.error_message}</small>}</button>) : <p>No import jobs yet.</p>}</section>
      {selected && job.data && <section className="admin-panel import-review"><p className="eyebrow">Job #{job.data.id} / {job.data.current_stage}</p><h2>{job.data.brand} {job.data.model} · {job.data.year}</h2><progress value={job.data.progress} max="100" /><p>{job.data.status} · {job.data.progress}%</p>{notice && <p role="status">{notice}</p>}{job.data.error_message && <p role="alert" className="error-text">{job.data.error_message}</p>}{job.data.status === "FAILED" && <Button disabled={pending} onClick={retry}>Retry pipeline</Button>}
        {job.data.candidate_model_url && <div className="import-preview"><ThreeScene preview modelUrl={job.data.candidate_model_url} modelConfig={previewConfig} /></div>}
        {job.data.status === "READY_FOR_REVIEW" && <><h3>Review {rows.length} geometry islands</h3><p>Assign the same componentId to merge source islands. Mark decorative geometry noninteractive. Every source island is retained in the review payload.</p><div className="review-list">{rows.map((row, index) => <article key={row.source_keys.join("|")}><div className="review-row"><FormField label="Component name"><input value={row.name} onChange={(event) => edit(index, "name", event.target.value)} /></FormField><FormField label="componentId"><input value={row.component_id} onChange={(event) => edit(index, "component_id", event.target.value)} /></FormField><FormField label="Category"><select value={row.category} onChange={(event) => edit(index, "category", event.target.value)}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></FormField><FormField label="Confidence"><select value={row.confidence} onChange={(event) => edit(index, "confidence", event.target.value)}>{["HIGH", "MEDIUM", "UNKNOWN"].map((confidence) => <option key={confidence}>{confidence}</option>)}</select></FormField><label><input type="checkbox" checked={row.disabled} onChange={(event) => edit(index, "disabled", event.target.checked)} /> Decorative / noninteractive</label></div><small>{row.source_objects.join(", ")} · {row.triangles} triangles · {row.reason}</small></article>)}</div><div className="actions"><Button secondary disabled={pending} onClick={saveReview}>Save review</Button><Button disabled={pending} onClick={publish}>Publish reviewed car</Button></div></>}
        {job.data.status === "READY" && job.data.car && <p>Published. <a href={`/cars/${job.data.car}`}>Open the car page</a></p>}
      </section>}
    </div></>;
}
