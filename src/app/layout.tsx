import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./critical.css";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Macro Prediction Learning Bot",
  description:
    "Log macro predictions, fetch real prices, and learn from outcomes over time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full ${inter.variable} ${jetbrains.variable}`}
    >
      <body
        className="min-h-full bg-macro-radial bg-fixed bg-no-repeat font-sans text-macro-ink antialiased selection:bg-blue-500/25 selection:text-white"
        style={{
          backgroundColor: "#0c0f14",
          color: "#e8eaed",
        }}
      >
        {children}
      </body>
    </html>
  );
}
