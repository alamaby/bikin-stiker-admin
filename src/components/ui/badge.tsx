import * as React from "react";
import TailBadge from "@/components/ui/badge/TailBadge";
import { cn } from "@/lib/utils";

// Backward-compatible wrapper: keeps the old `variant` API (default/secondary/outline/destructive)
// but renders TailAdmin badge styling (free-nextjs-admin-dashboard, MIT License).
// Pages migrated to full TailAdmin should import TailBadge directly for richer colors.

const variantMap = {
  default: { variant: "solid", color: "primary" },
  secondary: { variant: "light", color: "light" },
  outline: { variant: "light", color: "light" },
  destructive: { variant: "solid", color: "error" },
} as const;

type LegacyVariant = keyof typeof variantMap;

export interface BadgeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "color"> {
  variant?: LegacyVariant;
}

function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  const mapped = variantMap[variant ?? "default"];
  return (
    <TailBadge
      variant={mapped.variant as "light" | "solid"}
      color={mapped.color as "primary" | "light" | "error"}
      size="sm"
      className={cn(variant === "outline" && "ring-1 ring-inset ring-gray-300 dark:ring-gray-700", className)}
      {...props}
    >
      {children}
    </TailBadge>
  );
}

export { Badge };
