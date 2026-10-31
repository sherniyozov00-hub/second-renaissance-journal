import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker runner image.
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    // Manuscripts are up to 10 MB (TZ 7.3); both limits default to less.
    serverActions: { bodySizeLimit: "12mb" },
    proxyClientMaxBodySize: "12mb",
  },
};

export default withNextIntl(nextConfig);
