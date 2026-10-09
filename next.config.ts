import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin usa módulos de Node: que Next no intente empaquetarlo
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
