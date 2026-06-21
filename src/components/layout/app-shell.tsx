"use client";

import { useEffect, useRef, useState } from "react";
import { useAtom } from "jotai";
import { useHotkeys } from "react-hotkeys-hook";
import { Loader2, PanelLeft, PanelRight } from "lucide-react";
import type { PanelImperativeHandle } from "react-resizable-panels";
import { AnimatePresence, motion } from "framer-motion";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { zenModeAtom } from "@/lib/store/atoms";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { ChatPanel } from "@/components/ai-chat/chat-panel";
import { CommandPalette } from "@/components/command/command-palette";
import { SubjectDialog } from "@/components/sidebar/subject-dialog";
import { Onboarding } from "@/components/onboarding/onboarding";

/**
 * The persistent three-pane shell: sidebar · editor · AI panel.
 *
 * Both side panels can be collapsed/expanded with a button (in their header)
 * or a shortcut (⌘B sidebar, ⌘J assistant); a floating button reopens a panel
 * once collapsed. Zen mode (⌘⇧Z) hides both at once. Panels are resizable
 * (react-resizable-panels) and we drive collapse via their imperative handles.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [zen, setZen] = useAtom(zenModeAtom);

  const sidebarRef = useRef<PanelImperativeHandle | null>(null);
  const aiRef = useRef<PanelImperativeHandle | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiOpen, setAiOpen] = useState(true);

  function toggleSidebar() {
    const p = sidebarRef.current;
    if (!p) return;
    p.isCollapsed() ? p.expand() : p.collapse();
  }
  function toggleAi() {
    const p = aiRef.current;
    if (!p) return;
    p.isCollapsed() ? p.expand() : p.collapse();
  }

  useHotkeys("mod+b", (e) => { e.preventDefault(); toggleSidebar(); }, {
    enableOnFormTags: true,
    enableOnContentEditable: true,
  });
  useHotkeys("mod+j", (e) => { e.preventDefault(); toggleAi(); }, {
    enableOnFormTags: true,
    enableOnContentEditable: true,
  });

  // ⌘⇧Z / Ctrl⇧Z toggles zen mode. `enableOnFormTags` so it still fires while
  // the editor or a text field has focus.
  useHotkeys(
    "mod+shift+z",
    (e) => {
      e.preventDefault();
      setZen((z) => !z);
    },
    { enableOnFormTags: true, enableOnContentEditable: true },
    [setZen],
  );

  // Esc leaves zen mode.
  useHotkeys("esc", () => setZen(false), { enabled: zen }, [zen, setZen]);

  // The entire workspace is driven by localStorage-backed Jotai atoms (notes,
  // notebooks) which don't exist during SSR. Rendering them on the server would
  // produce a different tree than the client (hydration mismatch), and the
  // resizable panels need a real DOM to measure. So we render a neutral shell
  // on the server / first paint and swap to the live UI once mounted.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex h-dvh w-full items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      data-app-root
      className="h-dvh w-full overflow-hidden print:block print:h-auto print:overflow-visible"
    >
      <CommandPalette />
      <SubjectDialog />
      <Onboarding />

      {zen ? (
        <motion.main
          key="zen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mx-auto h-full w-full max-w-3xl px-6"
        >
          {children}
        </motion.main>
      ) : (
        // In react-resizable-panels v4, a bare number means *pixels*; sizes
        // as a percentage of the group must be strings ("18%").
        <ResizablePanelGroup
          orientation="horizontal"
          id="mattnotes:layout"
          className="print:block print:h-auto"
        >
          <ResizablePanel
            id="sidebar"
            panelRef={sidebarRef}
            defaultSize="18%"
            minSize="12%"
            maxSize="30%"
            collapsible
            collapsedSize="0%"
            onResize={(s) => setSidebarOpen(s.asPercentage > 1)}
            className="bg-sidebar print:hidden"
          >
            <AppSidebar onCollapse={toggleSidebar} />
          </ResizablePanel>

          <ResizableHandle className="print:hidden" />

          <ResizablePanel
            id="main"
            defaultSize="60%"
            minSize="30%"
            className="print:!h-auto print:!overflow-visible"
          >
            <main
              data-app-main
              className="h-full overflow-y-auto print:!h-auto print:!overflow-visible"
            >
              {children}
            </main>
          </ResizablePanel>

          <ResizableHandle className="print:hidden" />

          <ResizablePanel
            id="ai"
            panelRef={aiRef}
            defaultSize="22%"
            minSize="16%"
            maxSize="40%"
            collapsible
            collapsedSize="0%"
            onResize={(s) => setAiOpen(s.asPercentage > 1)}
            className="print:hidden"
          >
            <ChatPanel onCollapse={toggleAi} />
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      {/* Floating reopen buttons — shown only when a panel is collapsed. */}
      {!zen && !sidebarOpen && (
        <button
          onClick={toggleSidebar}
          aria-label="Mostra barra laterale"
          title="Mostra barra laterale (⌘B)"
          className="fixed top-3 left-3 z-50 rounded-lg border border-border bg-background/80 p-1.5 text-muted-foreground shadow-sm backdrop-blur-md transition-colors hover:text-foreground print:hidden"
        >
          <PanelLeft className="size-4" />
        </button>
      )}
      {!zen && !aiOpen && (
        <button
          onClick={toggleAi}
          aria-label="Mostra assistente"
          title="Mostra assistente (⌘J)"
          className="fixed top-3 right-3 z-50 rounded-lg border border-border bg-background/80 p-1.5 text-muted-foreground shadow-sm backdrop-blur-md transition-colors hover:text-foreground print:hidden"
        >
          <PanelRight className="size-4" />
        </button>
      )}

      {/* Floating "exit zen" affordance, mirrors the layout transition. */}
      <AnimatePresence>
        {zen && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={() => setZen(false)}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border bg-popover/80 px-4 py-1.5 text-xs text-muted-foreground shadow-lg backdrop-blur-md transition-colors hover:text-foreground"
          >
            Esci da Zen Mode · Esc
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
