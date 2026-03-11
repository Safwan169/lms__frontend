import "./globals.css";
import Providers from "@/providers/RootProviders";
import { defaultSEO } from "@/config/seoConfig";
import { Toaster } from "sonner";

export const metadata = {
  title: defaultSEO.title,
  description: defaultSEO.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Toaster />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}



