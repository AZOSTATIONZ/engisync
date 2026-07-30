/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  /**
   * The old `/dashboard/workspaces/*` tree is gone — a project now has exactly
   * one home under `/dashboard/projects/[id]`. These redirects keep existing
   * bookmarks, QR join links and notification links working.
   *
   * They are `permanent: false` on purpose: a 308 is cached hard by browsers,
   * so if any mapping here turns out to be wrong it would be stuck in users'
   * caches. Once the mapping is confirmed in production these can be flipped
   * to permanent and, a release later, deleted.
   */
  async redirects() {
    return [
      { source: "/dashboard/workspaces", destination: "/dashboard/projects", permanent: false },
      {
        source: "/dashboard/workspaces/invite/:token",
        destination: "/dashboard/projects/invite/:token",
        permanent: false,
      },
      {
        source: "/dashboard/workspaces/:id/documentation/:path*",
        destination: "/dashboard/projects/:id/document/:path*",
        permanent: false,
      },
      {
        source: "/dashboard/workspaces/:id/manage",
        destination: "/dashboard/projects/:id/team/manage",
        permanent: false,
      },
      // The old workspace detail page was the members/access view.
      { source: "/dashboard/workspaces/:id", destination: "/dashboard/projects/:id/team", permanent: false },
      {
        source: "/dashboard/workspaces/:id/:path*",
        destination: "/dashboard/projects/:id/:path*",
        permanent: false,
      },
      // The global file bucket is gone: evidence lives on the document section
      // it supports. Nothing sensible to deep-link to, so send people to their
      // projects.
      { source: "/dashboard/resources", destination: "/dashboard/projects", permanent: false },
      // Cross-project rollups folded into the project shell.
      { source: "/dashboard/budget/:id", destination: "/dashboard/projects/:id/money", permanent: false },
      { source: "/dashboard/budget", destination: "/dashboard/projects", permanent: false },
      { source: "/dashboard/analytics/:id", destination: "/dashboard/projects/:id/insights", permanent: false },
      { source: "/dashboard/analytics", destination: "/dashboard/projects", permanent: false },
    ];
  },

  async headers() {
    // Content-Security-Policy. 'unsafe-inline'/'unsafe-eval' are required by
    // Next.js's runtime and Tailwind's injected styles; everything else is
    // locked to same-origin. frame-ancestors 'none' is the modern,
    // CSP-level defence against clickjacking (X-Frame-Options is the legacy
    // fallback for older browsers).
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "media-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
          },
        ],
      },
      {
        // Never let authenticated API/file responses sit in shared caches.
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
    ];
  },
};

export default nextConfig;
