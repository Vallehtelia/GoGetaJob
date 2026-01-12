"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell/AppShell";
import { isAuthenticated } from "@/lib/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    }
  }, [router]);

  if (!isAuthenticated()) {
    return null; // or a loading spinner
  }

  return <AppShell>{children}</AppShell>;
}
