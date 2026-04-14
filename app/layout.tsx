// app/layout.tsx (or app/(dashboard)/layout.tsx)
import { Providers } from "@/components/providers"; // Adjust import path if needed
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Wrap children inside the Providers component */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}