import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// A relative base makes the static build work at any path, including a
// GitHub Pages project URL, without configuration.
export default defineConfig({
	root: fileURLToPath(new URL(".", import.meta.url)),
	base: "./",
	build: { outDir: "dist", emptyOutDir: true, target: "es2022" },
	server: { port: 5173 },
	preview: { port: 4173 },
});
