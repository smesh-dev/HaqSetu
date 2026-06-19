import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HaqSetu — The benefits you're owed, found and explained",
  description:
    "HaqSetu helps poor and marginalised Indian families discover the government welfare schemes and certificates they may be entitled to, untangles the documentation trap (which one paper unlocks the most benefits), and gives a simple step-by-step plan — in plain Hindi or English.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body
        className="min-h-full flex flex-col"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
