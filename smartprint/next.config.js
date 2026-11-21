/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.CLOUD_RUN_BUILD === "true" ? { output: "standalone" } : {}),
  experimental: {
    // Lifts the Server Action body limit. NOTE: this only applies to
    // Server Actions, not Route Handlers (`app/api/.../route.ts`). The
    // Vercel platform also enforces a serverless function request-body
    // cap of ~4.5 MB that this config CANNOT override. For uploads
    // larger than that, files must go directly from the browser to a
    // blob store (e.g. @vercel/blob client upload) instead of through
    // a function. Keeping this here for parity / forward-compat.
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

module.exports = nextConfig;
