import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NASA Command Center — Self-Healing Ad & SEO Swarm",
  description: "Autonomous Multi-Agent LangGraph DAG Orchestrator (Groq 120B + Gemini 2.5 Flash)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <body className="min-h-screen bg-[#050811] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
