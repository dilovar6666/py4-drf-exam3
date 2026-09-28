import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { storyPose, STORY_STAGES } from "../src/three/story.js";
import { audiR8ModelConfig } from "../src/models/audiR8.js";
import { resolveVehicleModelUrl } from "../src/three/modelUrl.js";

test("all 74 semantic IDs and all 152 source meshes remain configured", () => {
  assert.equal(Object.keys(audiR8ModelConfig.components).length, 74);
  const bytes = fs.readFileSync(
    new URL("../assets/models/AudiR8.glb", import.meta.url),
  );
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  const json = JSON.parse(
    bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString(),
  );
  assert.equal(
    json.nodes.filter((node) => node.mesh !== undefined).length,
    152,
  );
});
test("the exterior, engine and braking chapters stay assembled", () => {
  for (const progress of [0, 0.1, 0.2, 0.3, 0.4])
    assert.equal(storyPose(progress).explode, 0);
  assert.notDeepEqual(storyPose(0.2).camera, storyPose(0.4).camera);
});
test("disassembly is bounded, monotonic and deterministic", () => {
  let previous = 0;
  for (let i = 0; i <= 100; i++) {
    const pose = storyPose(i / 100);
    assert.ok(pose.explode >= previous && pose.explode <= 1);
    assert.deepEqual(pose, storyPose(i / 100));
    previous = pose.explode;
  }
  assert.equal(previous, 1);
  assert.equal(storyPose(-1).explode, 0);
  assert.equal(storyPose(2).explode, 1);
  assert.equal(STORY_STAGES.length, 6);
});
test("old local GLB URLs migrate without ignoring custom remote URLs", () => {
  assert.equal(
    resolveVehicleModelUrl(
      "http://127.0.0.1:4173/assets/models/AudiR8.glb",
      "http://localhost:4174",
    ),
    "/assets/models/AudiR8.glb",
  );
  assert.equal(
    resolveVehicleModelUrl(
      "https://cdn.example.org/assets/models/AudiR8.glb",
      "http://localhost:4174",
    ),
    "https://cdn.example.org/assets/models/AudiR8.glb",
  );
});
