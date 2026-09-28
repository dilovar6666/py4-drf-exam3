import test from "node:test";
import assert from "node:assert/strict";
import { explodeTargetFromSpread, smoothExplodePercent } from "../src/three/gestureMath.js";
import { validateViewerActions } from "../src/three/aiActions.js";
import { safeExternalUrl } from "../src/api/externalSearch.js";

test("two-hand spread drives the existing bounded explode percentage with a deadzone", () => {
  assert.equal(explodeTargetFromSpread(0.5, 0.5, 30), 30);
  assert.ok(explodeTargetFromSpread(0.7, 0.5, 30) > 60);
  assert.equal(explodeTargetFromSpread(0.3, 0.5, 30), 0);
  assert.equal(explodeTargetFromSpread(1.2, 0.4, 90), 100);
  assert.equal(explodeTargetFromSpread(0.4, 0.4, 20), 20);
  assert.ok(smoothExplodePercent(0, 100) > 0 && smoothExplodePercent(0, 100) < 100);
});

test("AI viewer actions are schema-checked against the current vehicle", () => {
  const actions = validateViewerActions([
    { type: "focus_component", componentId: "front_left_door" },
    { type: "focus_component", componentId: "unknown_part" },
    { type: "set_explode_percentage", value: 100 },
    { type: "set_explode_percentage", value: "100" },
    { type: "open_store", extra: "ignored" },
    { type: "run_javascript", code: "alert(1)" },
  ], 42, [{ component_id: "front_left_door" }]);
  assert.deepEqual(actions, [
    { type: "focus_component", componentId: "front_left_door" },
    { type: "set_explode_percentage", value: 100 },
    { type: "open_store" },
  ]);
  assert.deepEqual(validateViewerActions([{ type: "open_component", componentId: "front_left_door" }], null, [{ component_id: "front_left_door" }]), []);
});

test("external search links allow only HTTP(S) and never expose provider markup", () => {
  assert.equal(safeExternalUrl("https://parts.example/item"), "https://parts.example/item");
  assert.equal(safeExternalUrl("http://parts.example/item"), "http://parts.example/item");
  assert.equal(safeExternalUrl("javascript:alert(1)"), null);
  assert.equal(safeExternalUrl("data:text/html,<script>alert(1)</script>"), null);
  assert.equal(safeExternalUrl("not a URL"), null);
});
