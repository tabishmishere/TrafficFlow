import type { Metadata } from "next";
import { Source_Code_Pro } from "next/font/google";
import "./globals.css";

const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TrafficFlow — API gateway & observability",
    template: "%s · TrafficFlow",
  },
  description: "Route API traffic through one clear, developer-first gateway.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={sourceCodePro.variable}>
      <body>{children}</body>
    </html>
  );
}
