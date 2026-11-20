import type { Metadata } from "next";
import { AppLayoutContainer } from "@/src/modules/layout/containers/app-layout-container";
import "./globals.css";

export const metadata: Metadata = {
  title: "LGallery",
  description: "Your private photo and video library at home.",
  icons: { icon: [{ url: "/lgallery-logo.svg", type: "image/svg+xml" }] },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground">
        <AppLayoutContainer>{children}</AppLayoutContainer>
      </body>
    </html>
  );
}
