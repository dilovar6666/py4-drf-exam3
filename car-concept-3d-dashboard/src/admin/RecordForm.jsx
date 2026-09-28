import { useState } from "react";
import { managementApi } from "../api/catalog.js";
import { Button, FormField, Modal } from "../components/UI.jsx";
import { recordLabel } from "./schema.js";

export default function RecordForm({
  resource,
  schema,
  record,
  references,
  onClose,
  onSaved,
}) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      schema.fields.map((field) => [
        field.name,
        record?.[field.name] ?? (field.type === "checkbox" ? true : ""),
      ]),
    ),
  );
  const [error, setError] = useState(null),
    [pending, setPending] = useState(false);
  function update(field, value) {
    setValues((old) => ({ ...old, [field.name]: value }));
  }
  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const data = Object.fromEntries(
      schema.fields.map((field) => [
        field.name,
        field.type === "number" || field.type === "relation"
          ? values[field.name] === ""
            ? null
            : Number(values[field.name])
          : values[field.name],
      ]),
    );
    try {
      await managementApi.save(resource, {
        ...data,
        ...(record?.id ? { id: record.id } : {}),
      });
      onSaved();
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  }
  return (
    <Modal
      title={`${record?.id ? "Edit" : "Create"} ${schema.title.toLowerCase()}`}
      onClose={() => {
        if (!pending) onClose();
      }}
    >
      <form className="record-form" onSubmit={submit}>
        {schema.fields.map((field) => (
          <FormField
            key={field.name}
            label={field.label}
            error={error?.details?.[field.name]}
          >
            {field.type === "relation" ? (
              <select
                value={values[field.name]}
                required={!field.optional}
                onChange={(e) => update(field, e.target.value)}
              >
                <option value="">
                  {field.optional ? "None" : "Select a record"}
                </option>
                {references[field.resource]?.map((row) => (
                  <option key={row.id} value={row.id}>
                    {recordLabel(field.resource, row, references)}
                  </option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                rows={4}
                value={values[field.name]}
                required={!field.optional}
                onChange={(e) => update(field, e.target.value)}
              />
            ) : field.type === "checkbox" ? (
              <input
                type="checkbox"
                checked={values[field.name]}
                onChange={(e) => update(field, e.target.checked)}
              />
            ) : (
              <input
                type={field.type}
                value={values[field.name]}
                required={!field.optional}
                min={field.type === "number" ? 1886 : undefined}
                max={field.type === "number" ? 2100 : undefined}
                onChange={(e) => update(field, e.target.value)}
              />
            )}
          </FormField>
        ))}
        {resource === "cars" && (
          <p className="admin-note">
            Change the vehicle title or manufacturer in Vehicle models / Car
            manufacturers.
          </p>
        )}
        {resource === "products" && (
          <p className="admin-note">
            Product images are managed in Product images. This schema has no
            price field.
          </p>
        )}
        {error && (
          <p role="alert" className="error-text">
            {error.message}
          </p>
        )}
        <div className="actions">
          <Button secondary type="button" disabled={pending} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={pending}>
            {pending ? "Saving…" : "Save record"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
