import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "draft" | "applied" | "interview" | "offer" | "rejected" | "default";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-muted text-muted-foreground",
    draft: "bg-gray-500/20 text-gray-300 border border-gray-500/30",
    applied: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    interview: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
    offer: "gradient-accent text-white font-semibold shadow-lg shadow-accent/30",
    rejected: "bg-red-500/20 text-red-300 border border-red-500/30",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
