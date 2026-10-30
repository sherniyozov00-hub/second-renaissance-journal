import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker runner image.
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
};

export default withNextIntl(nextConfig);
