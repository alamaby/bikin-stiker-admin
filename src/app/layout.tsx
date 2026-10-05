import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { NavigationProgress } from "@/components/navigation-progress";
import { Suspense } from "react";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bikin Stiker Admin",
  description: "Admin dashboard for Bikin Stiker – Supabase backend",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark");}else{document.documentElement.classList.remove("dark");}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <ThemeProvider>
          <SidebarProvider>
            <Suspense fallback={null}>
              <NavigationProgress />
            </Suspense>
            {children}
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
