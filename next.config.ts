import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip ESLint during production build
  eslint: { ignoreDuringBuilds: true },

  // Optimize heavy package imports — tree-shake only what's used
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@radix-ui/react-dialog",
      "@radix-ui/react-popover",
      "@radix-ui/react-checkbox",
      "@supabase/supabase-js",
      "sonner",
      "zod",
    ],
  },

  // Allow images from Supabase storage
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
