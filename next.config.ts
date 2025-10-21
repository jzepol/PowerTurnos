import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Optimizaciones para evitar loops de actualización
  experimental: {
    // Mejorar el comportamiento del Fast Refresh
    optimizePackageImports: ['@/lib/logger', '@/lib/date-utils'],
  },
  // Configuración para desarrollo
  ...(process.env.NODE_ENV === 'development' && {
    // Reducir la frecuencia de verificación de archivos
    onDemandEntries: {
      // Período en ms donde las páginas se mantienen en memoria
      maxInactiveAge: 25 * 1000,
      // Número de páginas que deben mantenerse simultáneamente sin ser descartadas
      pagesBufferLength: 2,
    },
  }),
};

export default nextConfig;
