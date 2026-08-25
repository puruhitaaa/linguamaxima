import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), tanstackStart(), nitro(), viteReact()],
  resolve: {
    tsconfigPaths: true,
  },
  ssr: {
    external: ["react", "react-dom"],
    noExternal:
      process.env.NODE_ENV === "production"
        ? true
        : ["@linguamaxima/ui", "@linguamaxima/env"],
  },
  server: {
    port: 3001,
  },
});
