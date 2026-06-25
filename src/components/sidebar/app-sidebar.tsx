"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSetAtom } from "jotai";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { Command, FileText, LogIn, NotebookPen, PanelLeftClose } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { commandPaletteOpenAtom } from "@/lib/store/atoms";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { SubjectTree } from "@/components/sidebar/subject-tree";

/** Sidebar container: brand header, command-palette launcher, and the tree. */
export function AppSidebar({ onCollapse }: { onCollapse?: () => void }) {
  const setPaletteOpen = useSetAtom(commandPaletteOpenAtom);
  const pathname = usePathname();
  const pdfsActive = pathname?.startsWith("/pdfs");

  return (
    <div className="flex h-full flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center justify-between px-3 py-3">
        <Link href="/app" className="flex items-center gap-2 font-semibold">
          <NotebookPen className="size-5 text-primary" />
          <span>MattNotes</span>
        </Link>
        <div className="flex items-center gap-0.5">
          <ThemeToggle />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9"
                aria-label="Nascondi barra laterale"
                onClick={onCollapse}
              >
                <PanelLeftClose className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Nascondi barra laterale · ⌘B</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="px-3 pb-2">
        <Button
          variant="outline"
          onClick={() => setPaletteOpen(true)}
          className="h-8 w-full justify-start gap-2 text-muted-foreground"
        >
          <Command className="size-3.5" />
          <span className="flex-1 text-left text-xs">Comandi…</span>
          <kbd className="pointer-events-none rounded border bg-muted px-1.5 font-mono text-[10px]">
            ⌘K
          </kbd>
        </Button>
      </div>

      <div className="px-3 pb-2">
        <Link
          href="/pdfs"
          className={cn(
            "flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm transition-colors",
            pdfsActive
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
          )}
        >
          <FileText className="size-3.5" />
          I tuoi PDF
        </Link>
      </div>

      <SubjectTree />

      {/* Account / sync footer. Signed out, the app stays local-first; signing
          in turns on cross-device sync. */}
      <div className="border-t border-sidebar-border px-3 py-2">
        <Show when="signed-out">
          <SignInButton mode="modal">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground"
            >
              <LogIn className="size-4" />
              Accedi per sincronizzare
            </Button>
          </SignInButton>
        </Show>
        <Show when="signed-in">
          <div className="flex items-center gap-2">
            <UserButton appearance={{ elements: { rootBox: "shrink-0" } }} />
            <span className="truncate text-xs text-muted-foreground">
              Sincronizzazione attiva
            </span>
          </div>
        </Show>
      </div>
    </div>
  );
}
