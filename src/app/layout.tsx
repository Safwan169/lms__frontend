import "./globals.css";
import Providers from "@/providers/RootProviders";
import { defaultSEO } from "@/config/seoConfig";
import { Toaster } from "sonner";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata = {
  title: defaultSEO.title,
  description: defaultSEO.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        <Toaster />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}



