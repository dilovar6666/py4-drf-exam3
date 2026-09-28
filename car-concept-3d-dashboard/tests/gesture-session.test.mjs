import test from "node:test";
import assert from "node:assert/strict";
import { MediaPipeGestureSession } from "../src/three/mediaPipeGestureSession.js";

test("permission resolving after Stop immediately releases the late stream", async () => {
  let resolveCamera;
  let stopped = 0;
  const track = { stop() { stopped += 1; }, addEventListener() {}, removeEventListener() {} };
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] };
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { mediaDevices: { getUserMedia: () => new Promise((resolve) => { resolveCamera = resolve; }) } } });
  const session = new MediaPipeGestureSession({ video: {}, canvas: null });
  try {
    const starting = session.start();
    session.stop();
    resolveCamera(stream);
    await starting;
    assert.equal(stopped, 1);
    assert.equal(session.stream, null);
  } finally {
    if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
    else delete globalThis.navigator;
  }
});

test("Stop releases the camera, recognizer and preview references once", () => {
  let stopped = 0, closed = 0, canceled = 0;
  const originalCancel = globalThis.cancelAnimationFrame;
  globalThis.cancelAnimationFrame = () => { canceled += 1; };
  const track = { stop() { stopped += 1; }, addEventListener() {}, removeEventListener() {} };
  const video = { srcObject: { getTracks: () => [track] } };
  const context = { clearRect() {} };
  const canvas = { width: 1, height: 1, getContext: () => context };
  const session = new MediaPipeGestureSession({ video, canvas, onState: () => {} });
  session.stream = video.srcObject;
  session.recognizer = { close() { closed += 1; } };
  session.frameId = 4;
  session.stop();
  session.stop();
  assert.equal(stopped, 1);
  assert.equal(closed, 1);
  assert.equal(video.srcObject, null);
  assert.equal(canceled, 2);
  globalThis.cancelAnimationFrame = originalCancel;
});
