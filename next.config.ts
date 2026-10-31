import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/**
 * Security headers (TZ 17). Scripts are not restricted by CSP because Next
 * inlines its bootstrap; the policy below blocks framing, plugins and base-tag
 * hijacking and allows only the lesson video players in iframes.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  {
    key: "Content-Security-Policy",
    value: [
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
      "frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker runner image.
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  reactStrictMode: true,
  experimental: {
    // Manuscripts are up to 10 MB (TZ 7.3); both limits default to less.
    serverActions: { bodySizeLimit: "12mb" },
    proxyClientMaxBodySize: "12mb",
  },
};

export default withNextIntl(nextConfig);
