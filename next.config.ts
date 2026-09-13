import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// A Content-Security-Policy. There was none, so any injected markup — a team
// name rendered in the admin console, a stray third-party script — could load
// and exfiltrate to an arbitrary origin. This locks the page down to our own
// origin plus the two third parties the site actually uses (Google Fonts, and
// Google's map/document embeds).
//
// script-src keeps 'unsafe-inline': Next's App Router emits inline bootstrap
// and flight-data scripts, and src/components/seo/JsonLd.tsx emits inline
// application/ld+json. Nonce-based CSP needs a middleware that stamps every
// response, which opts the whole marketing site out of static rendering. The
// directive still blocks the more common case of a script loaded from an
// attacker-controlled host, and object-src/base-uri/form-action close the
// classic bypasses.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob:",
  // WebGL (ogl/three) compiles shaders into blob workers.
  "worker-src 'self' blob:",
  // The venue map embed, and the Docs viewer used to preview submitted decks.
  "frame-src 'self' https://www.google.com https://docs.google.com",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "upgrade-insecure-requests"
].join("; ");

// Baseline security headers. There were none, and there is no middleware, so
// /admin was framable and the portal leaked its URL (which used to carry the
// team passcode) in the Referer of every cross-origin request.
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Stop the admin console being framed into a clickjacking overlay.
  // Redundant with frame-ancestors, kept for older browsers.
  { key: "X-Frame-Options", value: "DENY" },
  // Never send our URLs (or their query strings) to third-party origins.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // No MIME sniffing on uploaded decks served from our own origin.
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const longLivedAssetHeaders = [
  { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
];

const revalidatingAssetHeaders = [
  { key: "Cache-Control", value: "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800" },
];

const privateNoStoreHeaders = [
  { key: "Cache-Control", value: "private, no-store, max-age=0" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75],
  },
  async rewrites() {
    return { beforeFiles: [{ source: '/uploads/:path*', destination: '/api/uploads-blocked' }] };
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/orion-logo-v1.webp",
        headers: longLivedAssetHeaders,
      },
      ...["/logo.png", "/icon.png", "/favicon.png", "/favicon.ico", "/favicon.svg", "/og-image.png", "/llms.txt", "/ORION_1.0_Template.pptx"].map(source => ({
        source,
        headers: revalidatingAssetHeaders,
      })),
      ...[
        "/admin",
        "/admin/:path*",
        "/portal",
        "/portal/:path*",
        "/api/admin/:path*",
        "/api/team/:path*",
        "/api/auth/team",
        "/api/auth/team/:path*",
        "/api/private-files",
        "/api/status",
        "/api/registrations",
        "/api/cron/:path*",
      ].map(source => ({
        source,
        headers: privateNoStoreHeaders,
      })),
      {
        // Uploaded participant decks are attacker-supplied bytes served from
        // our own origin. Force a download rather than inline rendering, and
        // sandbox them out of the origin's script context.
        source: "/uploads/:path*",
        headers: [
          ...securityHeaders.filter(h => h.key !== "Content-Security-Policy"),
          { key: "Content-Disposition", value: "attachment" },
          { key: "Content-Security-Policy", value: "sandbox; default-src 'none'" },
        ],
      },
    ];
  },
};

export default nextConfig;
