import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useLanguage } from "../src/i18n.js";

const values = new Map();
globalThis.localStorage = { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
const keys = [
  "home", "info", "register", "aiNav", "footerTagline", "learnMore",
  "gestureGuide", "handsDetected", "cameraOn", "cameraOff", "hidePreview",
  "cameraDenied", "cameraPhaseREADY", "listen", "stopVoice", "autoPlayVoice",
  "voiceProviderError", "infoCameraPrivacy", "checkingSession",
];

function Words() {
  const { t } = useLanguage();
  return React.createElement("div", null, keys.map((key) => React.createElement("span", { key, "data-key": key }, t(key))));
}

for (const language of ["ru", "tg", "en"]) {
  test(`${language} has all new public UX translations`, () => {
    values.set("aa-language", language);
    const html = renderToStaticMarkup(React.createElement(Words));
    for (const key of keys) {
      const found = html.match(new RegExp(`data-key="${key}"[^>]*>([^<]*)<`));
      assert.ok(found, key);
      assert.notEqual(found[1], key, key);
      assert.ok(found[1].length > 0, key);
    }
  });
}
