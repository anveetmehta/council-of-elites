import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";
import "./globals.css";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { GrainOverlay } from "@/components/GrainOverlay";
import { CursorHalo } from "@/components/CursorHalo";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Council of Elites — Multi-perspective AI advisory",
  description:
    "Assemble a council of AI advisors with distinct perspectives. Get diverging, contrasting views on your most important decisions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${instrumentSerif.variable} bg-surface text-text-primary min-h-screen`}
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        {/* Grain texture — subtle dark-mode film grain */}
        <GrainOverlay />
        {/* Cursor halo — accent purple spring-follower */}
        <CursorHalo />
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
