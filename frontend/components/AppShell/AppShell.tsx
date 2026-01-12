"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "../Sidebar/Sidebar";
import { User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUser, clearTokens } from "@/lib/auth";

function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    setUser(getUser());
  }, []);

  const handleLogout = () => {
    clearTokens();
    router.push("/login");
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-3 px-4 py-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
      >
        <div className="w-8 h-8 rounded-full gradient-accent flex items-center justify-center">
          <User className="h-4 w-4 text-white" />
        </div>
        <div className="text-sm text-left">
          <p className="font-medium">User</p>
          <p className="text-xs text-muted-foreground">{user?.email || "user@example.com"}</p>
        </div>
      </button>

      {showMenu && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-card border border-border shadow-lg z-50 overflow-hidden">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted transition-colors text-red-400"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // Avoid hydration mismatch
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main content area */}
      <div
        className={cn(
          "transition-all duration-300",
          sidebarCollapsed ? "ml-20" : "ml-64"
        )}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-card/80 backdrop-blur-md border-b border-border">
          <div className="flex h-full items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold">Welcome back!</h2>
            </div>
            
            {/* User area */}
            <UserMenu />
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
