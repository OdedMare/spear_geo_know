import type { NextConfig } from "next";

// A static export: `npm run build` writes plain HTML, JS, CSS and data to
// out/, which any web server can serve with no Node and no network. Every
// page is client-side already, and nothing is fetched from outside the site.
// trailingSlash makes each page a folder with index.html, which every static
// server (nginx, IIS, python -m http.server, serve.mjs) resolves on its own.
const nextConfig: NextConfig = {
  reactStrictMode: false,
  output: "export",
  trailingSlash: true,
};

export default nextConfig;
