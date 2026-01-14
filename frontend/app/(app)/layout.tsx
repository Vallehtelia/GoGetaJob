"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell/AppShell";
import { isAuthenticated } from "@/lib/auth";

const Chatbot = dynamic(() => import("@/components/Chatbot").then((m) => m.Chatbot), {
  ssr: false,
});

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isPrintRoute = pathname?.includes("/print");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated()) {
      router.replace("/login");
    }
  }, [mounted, router]);

  // Avoid hydration mismatches: server + first client render should match.
  if (!mounted) return null;
  if (!isAuthenticated()) return null;

  // Print routes should render only the content (no AppShell, no chatbot)
  if (isPrintRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <AppShell>{children}</AppShell>
      <Chatbot />
    </>
  );
}
