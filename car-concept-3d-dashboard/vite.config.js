import { defineConfig } from "vite";
import { resolve } from "node:path";
import { createReadStream, existsSync, readFileSync } from "node:fs";

const vehicleAssets = ['AudiR8.glb', ...JSON.parse(readFileSync(resolve('src/models/vehicles.json'), 'utf8')).map(car => car.file)];

// Keep the prepared GLB in its existing location, and serve it on every route.
export default defineConfig({
  esbuild: { jsx: "automatic" },
  server: {
    proxy: { "/api": "http://127.0.0.1:8000" },
    watch: { ignored: ["**/qa/gt40-deep/edge-profile/**"] },
  },
  preview: { proxy: { "/api": "http://127.0.0.1:8000" } },
  plugins: [
    {
      name: "existing-audi-assets",
      configureServer(server) {
        server.middlewares.use("/assets/models", (request, response, next) => {
          const name = decodeURIComponent(
            (request.url || "").split("?")[0],
          ).replace(/^\//, "");
          if (!vehicleAssets.includes(name)) return next();
          response.setHeader("Content-Type", "model/gltf-binary");
          createReadStream(resolve("assets/models", name)).pipe(response);
        });
      },
      generateBundle() {
        for (const name of vehicleAssets) {
        const source = resolve("assets/models", name);
        if (existsSync(source))
          this.emitFile({
            type: "asset",
            fileName: `assets/models/${name}`,
            source: readFileSync(source),
          });
        }
      },
    },
  ],
});
