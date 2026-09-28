import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { pageResults } from "../api.js";
import { managementApi } from "../api/catalog.js";
import { useApi } from "../hooks/useApi.js";
import {
  Button,
  ConfirmDialog,
  Pagination,
  SearchInput,
  StateView,
  FormField,
} from "../components/UI.jsx";
import RecordForm from "./RecordForm.jsx";
import { RESOURCES, recordLabel } from "./schema.js";
import AdminPlatformResource from "./AdminPlatformResource.jsx";

const PLATFORM_SECTIONS = new Set(["3d-models", "users", "garage", "ai", "analytics", "tasks", "settings"]);

export function AdminTable({
  rows,
  schema,
  references,
  onEdit,
  onDelete,
  onToggle,
}) {
  function display(row, column) {
    const field = schema.fields.find((item) => item.name === column);
    if (field?.type === "relation")
      return recordLabel(
        field.resource,
        references[field.resource]?.find((r) => r.id === row[column]),
        references,
      );
    if (column === "is_active")
      return (
        <button
          className="status-toggle"
          onClick={() => onToggle(row)}
          aria-label={`${row.is_active ? "Deactivate" : "Activate"} vehicle ${row.id}`}
        >
          {row.is_active ? "Active" : "Inactive"}
        </button>
      );
    if (column === "is_draft") return row.is_draft ? "DRAFT" : "Published";
    return String(row[column] ?? "—");
  }
  return (
    <div className="table-scroll">
      <table className="admin-table">
        <thead>
          <tr>
            {schema.columns.map((name) => (
              <th key={name}>
                {schema.fields.find((f) => f.name === name)?.label || name}
              </th>
            ))}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {schema.columns.map((column) => (
                <td key={column}>{display(row, column)}</td>
              ))}
              <td>
                <div className="table-actions">
                  <button onClick={() => onEdit(row)}>Edit</button>
                  <button onClick={() => onDelete(row)}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default function AdminResource() {
  const { resource } = useParams(),
    schema = RESOURCES[resource];
  if (PLATFORM_SECTIONS.has(resource)) return <AdminPlatformResource />;
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [car, setCar] = useState(""),
    [form, setForm] = useState(null),
    [deleting, setDeleting] = useState(null),
    [pending, setPending] = useState(false),
    [mutationError, setMutationError] = useState(null);
  useEffect(() => {
    setPage(1);
    setSearch("");
    setCar("");
    setForm(null);
    setDeleting(null);
    setMutationError(null);
  }, [resource]);
  const state = useApi(async () => {
    if (!schema) return null;
    const related = [
      ...new Set(schema.fields.map((f) => f.resource).filter(Boolean)),
    ];
    if (related.includes("cars") || related.includes("models"))
      related.push("models", "brands");
    const entries = await Promise.all(
      [...new Set(related)].map(async (key) => [
        key,
        await managementApi.all(key),
      ]),
    );
    const payload = await managementApi.list(resource, {
      page,
      search,
      ...(resource === "components" || resource === "compatibility"
        ? { car }
        : {}),
    });
    return { payload, references: Object.fromEntries(entries) };
  }, [resource, page, search, car]);
  if (!schema) return <StateView empty="Management section not found." />;
  async function remove() {
    setPending(true);
    setMutationError(null);
    try {
      await managementApi.remove(resource, deleting.id);
      setDeleting(null);
      state.retry();
    } catch (err) {
      setMutationError(err);
    } finally {
      setPending(false);
    }
  }
  async function toggle(row) {
    setMutationError(null);
    try {
      await managementApi.save(resource, {
        id: row.id,
        is_active: !row.is_active,
      });
      state.retry();
    } catch (err) {
      setMutationError(err);
    }
  }
  return (
    <>
      <header className="admin-heading">
        <p className="eyebrow">Archive management</p>
        <div className="admin-heading__row">
          <h1>{schema.title}</h1>
          <Button
            onClick={() => setForm({})}
            disabled={state.loading || Boolean(state.error)}
          >
            Create record +
          </Button>
        </div>
      </header>
      <div className="admin-toolbar">
        <SearchInput
          value={search}
          placeholder="Search records"
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        {(resource === "components" || resource === "compatibility") && (
          <FormField label="Vehicle">
            <select
              value={car}
              onChange={(e) => {
                setCar(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All vehicles</option>
              {state.data?.references.cars?.map((row) => (
                <option key={row.id} value={row.id}>
                  {recordLabel("cars", row, state.data.references)}
                </option>
              ))}
            </select>
          </FormField>
        )}
        {resource === "components" && (
          <Link className="text-link" to="/admin/specifications">
            Edit technical specifications ↗
          </Link>
        )}
        {resource === "products" && (
          <Link className="text-link" to="/admin/images">
            Manage product images ↗
          </Link>
        )}
        {resource === "cars" && (
          <Link className="text-link" to="/admin/models">
            Edit model names / manufacturers ↗
          </Link>
        )}
      </div>
      {mutationError && !deleting && (
        <p role="alert" className="error-text">
          {mutationError.message}
        </p>
      )}
      {state.loading || state.error ? (
        <StateView {...state} />
      ) : pageResults(state.data?.payload).length ? (
        <>
          <AdminTable
            rows={pageResults(state.data.payload)}
            schema={schema}
            references={state.data.references}
            onEdit={setForm}
            onDelete={(row) => {
              setMutationError(null);
              setDeleting(row);
            }}
            onToggle={toggle}
          />
          <Pagination
            payload={state.data.payload}
            page={page}
            setPage={setPage}
          />
        </>
      ) : (
        <StateView empty="No matching records." />
      )}
      {form && state.data && (
        <RecordForm
          key={`${resource}-${form.id || "new"}`}
          resource={resource}
          schema={schema}
          record={form}
          references={state.data.references}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            state.retry();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          record={deleting}
          pending={pending}
          error={mutationError}
          onConfirm={remove}
          onClose={() => {
            if (!pending) setDeleting(null);
          }}
        />
      )}
    </>
  );
}
