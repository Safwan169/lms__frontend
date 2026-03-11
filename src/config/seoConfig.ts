// src/config/seoConfig.ts
export const defaultSEO = {
  title: process.env.NEXT_PUBLIC_APP_NAME || "Next.js Boilerplate",
  description: "Professional Next.js boilerplate with RTK Query, TanStack Query, Axios, and more.",
  openGraph: {
    type: "website",
    locale: "en_US",
    site_name: process.env.NEXT_PUBLIC_APP_NAME || "Boilerplate"
  }
};
