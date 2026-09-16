import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Gen3ia AI Studio",
    template: "%s | Gen3ia AI Studio",
  },
  description:
    "Autonomous AI agents, dynamic skills, real-time research, multimodal generation, code execution and deployment infrastructure.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
