"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "../Sidebar/Sidebar";
import { MessageSquare, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUser, logout } from "@/lib/auth";
import { api } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { toast } from "@/components/Toast";
import { usePathname } from "next/navigation";
import type { FeedbackType } from "@/lib/types";

function UserMenu() {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    setUser(getUser());
  }, []);

  const handleLogout = async () => {
    setShowMenu(false);
    try {
      // Best-effort: revoke all refresh tokens for this user
      await api.logoutAll();
    } catch {
      // Ignore network/server errors; still clear local session
    } finally {
      logout();
    }
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
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("bug");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    api.getMe()
      .then((me) => setIsAdmin(!!me.isAdmin))
      .catch(() => setIsAdmin(false));
  }, [mounted]);

  if (!mounted) {
    return null; // Avoid hydration mismatch
  }

  const submitFeedback = async () => {
    if (feedbackMessage.trim().length < 10) {
      toast.error("Please enter at least 10 characters.");
      return;
    }

    try {
      setSubmittingFeedback(true);
      await api.submitFeedback({
        type: feedbackType,
        message: feedbackMessage.trim(),
        pagePath: pathname || undefined,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      });
      toast.success("Thanks for the feedback!");
      setFeedbackOpen(false);
      setFeedbackMessage("");
      setFeedbackType("bug");
    } catch (error: any) {
      const errorData = error.errorData || error;
      if (errorData?.statusCode === 429) {
        toast.error("Too many requests. Please wait a bit and try again.");
      } else {
        toast.error(errorData?.message || error.message || "Failed to submit feedback");
      }
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        isAdmin={isAdmin}
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
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => setFeedbackOpen(true)}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Feedback
              </Button>
              <UserMenu />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>

      <Modal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} title="Send feedback" size="sm">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="feedbackType">Type</Label>
            <select
              id="feedbackType"
              className="flex w-full rounded-xl border border-border bg-background px-4 py-2 text-sm"
              value={feedbackType}
              onChange={(e) => setFeedbackType(e.target.value as FeedbackType)}
              disabled={submittingFeedback}
            >
              <option value="bug">Bug</option>
              <option value="feature">Feature</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedbackMessage">Message</Label>
            <Textarea
              id="feedbackMessage"
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              placeholder="What happened / what would you like to see?"
              rows={6}
              maxLength={5000}
              disabled={submittingFeedback}
            />
            <div className="text-xs text-muted-foreground flex justify-between">
              <span>{pathname ? `Page: ${pathname}` : null}</span>
              <span>{feedbackMessage.length}/5000</span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setFeedbackOpen(false)} disabled={submittingFeedback}>
              Cancel
            </Button>
            <Button onClick={submitFeedback} disabled={submittingFeedback}>
              {submittingFeedback ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
