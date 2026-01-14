"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell/AppShell";
import { isAuthenticated } from "@/lib/auth";
import { endActivitySession, ensureActivitySession, getStoredActivitySessionId, sendActivityHeartbeat, sendActivityPageview } from "@/lib/analytics";

const Chatbot = dynamic(() => import("@/components/Chatbot").then((m) => m.Chatbot), {
  ssr: false,
});

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isPrintRoute = pathname?.includes("/print");
  const [mounted, setMounted] = useState(false);
  const [activitySessionId, setActivitySessionId] = useState<string | null>(null);
  const authed = mounted && isAuthenticated();
  const shouldTrack = authed && !isPrintRoute;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated()) {
      router.replace("/login");
    }
  }, [mounted, router]);

  // Activity tracking: start/resume session
  useEffect(() => {
    if (!shouldTrack) return;
    let cancelled = false;
    (async () => {
      const sessionId = await ensureActivitySession();
      if (!cancelled) setActivitySessionId(sessionId);
    })();
    return () => {
      cancelled = true;
    };
  }, [shouldTrack]);

  // Track page views (debounced)
  useEffect(() => {
    if (!shouldTrack) return;
    if (!activitySessionId) return;
    const t = window.setTimeout(() => {
      sendActivityPageview(activitySessionId, pathname || "/");
    }, 250);
    return () => window.clearTimeout(t);
  }, [shouldTrack, activitySessionId, pathname]);

  // Heartbeat (1/min)
  useEffect(() => {
    if (!shouldTrack) return;
    if (!activitySessionId) return;
    const id = window.setInterval(() => {
      sendActivityHeartbeat(activitySessionId);
    }, 60_000);
    return () => window.clearInterval(id);
  }, [shouldTrack, activitySessionId]);

  // Best-effort end on unmount (not guaranteed)
  useEffect(() => {
    if (!shouldTrack) return;
    return () => {
      const sid = activitySessionId || getStoredActivitySessionId();
      if (sid) endActivitySession(sid);
    };
  }, [shouldTrack, activitySessionId]);

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
