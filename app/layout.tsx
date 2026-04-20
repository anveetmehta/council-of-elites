import type { Metadata } from "next";
import "./globals.css";
import { PostHogProvider } from "@/components/providers/PostHogProvider";

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
      <body className="bg-surface text-text-primary min-h-screen">
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
