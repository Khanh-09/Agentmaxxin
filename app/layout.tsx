import "./globals.css";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const jetBrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://agentmaxxin-khanh15.vercel.app"),
  title: "AgentMaxx Studio — Autonomous Web3 AI Agent & On-Chain Cognitive DApp",

  description:
    "Next-generation autonomous AI Agent powered by Google Gemini, LangGraph reasoning, Base Sepolia L2 on-chain execution, DeFi swaps, and DSPy-style in-context self-training.",
  keywords: [
    "AI Agent",
    "Web3 AI",
    "Base Sepolia",
    "LangGraph",
    "Autonomous Agent",
    "Coinbase AgentKit",
    "DeFi Swap",
    "Smart Contracts",
    "Gemini 3.5 Flash",
    "Agentmaxxing",
    "On-Chain AI",
  ],
  authors: [{ name: "Khanh-09", url: "https://github.com/Khanh-09/Agentmaxxin" }],
  creator: "Khanh-09",
  publisher: "AgentMaxx Studio",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://agentmaxxin-khanh15.vercel.app",
    siteName: "AgentMaxx Studio",
    title: "AgentMaxx Studio — Autonomous Web3 AI Agent",
    description:
      "Autonomous Web3 AI Agent with Base Sepolia L2 execution, 28 multi-domain tools, real-time weather & market intelligence, and self-improving cognitive loop.",
    images: [
      {
        url: "/risein-logo.svg",
        width: 800,
        height: 600,
        alt: "AgentMaxx Studio Banner",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AgentMaxx Studio — Autonomous Web3 AI Agent",
    description: "Multi-domain autonomous AI Agent with on-chain Base Sepolia L2 wallet execution & active learning loop.",
    creator: "@Khanh",
    images: ["/risein-logo.svg"],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "AgentMaxx Studio",
  "operatingSystem": "Web, Cloud, Serverless",
  "applicationCategory": "Decentralized Finance, Artificial Intelligence, Developer Tools",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
  },
  "description":
    "Autonomous Web3 AI Agent with LangGraph cognitive architecture, Base Sepolia L2 execution, and multi-domain tool execution.",
  "author": {
    "@type": "Person",
    "name": "Khanh",
    "url": "https://github.com/Khanh-09/Agentmaxxin",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("dark font-sans antialiased", spaceGrotesk.variable, jetBrainsMono.variable)}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
