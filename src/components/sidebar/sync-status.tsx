"use client";

import { Check, CloudOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SyncStatus as SyncStatusType } from "@/lib/types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const CONFIG: Record<
  SyncStatusType,
  { label: string; icon: React.ElementType; className: string; spin?: boolean }
> = {
  synced: { label: "Salvato", icon: Check, className: "text-emerald-500" },
  syncing: {
    label: "Sincronizzazione…",
    icon: RefreshCw,
    className: "text-amber-500",
    spin: true,
  },
  local: { label: "In attesa di sync", icon: RefreshCw, className: "text-muted-foreground" },
  offline: { label: "Offline", icon: CloudOff, className: "text-destructive" },
};

/** Compact per-note sync indicator (✓ / ⟳ / ✗). */
export function SyncStatus({
  status,
  className,
}: {
  status: SyncStatusType;
  className?: string;
}) {
  const { label, icon: Icon, className: color, spin } = CONFIG[status];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex", color, className)} aria-label={label}>
          <Icon className={cn("size-3.5", spin && "animate-spin")} />
        </span>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
