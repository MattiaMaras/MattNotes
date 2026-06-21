"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useHotkeys } from "react-hotkeys-hook";
import { Command } from "cmdk";
import { useTheme } from "@/components/providers/theme-provider";
import {
  Brain,
  FileDown,
  FileText,
  FolderPlus,
  Home,
  Maximize2,
  Moon,
  Plus,
  Sparkles,
  Sun,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  commandPaletteOpenAtom,
  createNoteAtom,
  dueFlashcardsAtom,
  notebooksAtom,
  notesAtom,
  onboardingDoneAtom,
  subjectDialogAtom,
  zenModeAtom,
} from "@/lib/store/atoms";
import { SubjectGlyph } from "@/components/sidebar/subject-glyph";
import { downloadNotePdf, printNoteToPdf } from "@/lib/export/print-note";

/**
 * ⌘K command palette (Linear-style) built on `cmdk`. Searches notes and runs
 * top-level actions. Opening is driven by `commandPaletteOpenAtom` so any
 * component (e.g. the sidebar button) can trigger it.
 */
export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const onNote = pathname?.startsWith("/note/") ?? false;
  const [open, setOpen] = useAtom(commandPaletteOpenAtom);
  const notes = useAtomValue(notesAtom);
  const notebooks = useAtomValue(notebooksAtom);
  const due = useAtomValue(dueFlashcardsAtom);
  const createNote = useSetAtom(createNoteAtom);
  const openSubjectDialog = useSetAtom(subjectDialogAtom);
  const setOnboardingDone = useSetAtom(onboardingDoneAtom);
  const setZen = useSetAtom(zenModeAtom);
  const { resolvedTheme, setTheme } = useTheme();

  useHotkeys(
    "mod+k",
    (e) => {
      e.preventDefault();
      setOpen((o) => !o);
    },
    { enableOnFormTags: true, enableOnContentEditable: true },
    [setOpen],
  );

  // Wraps an action so it always closes the palette first.
  function run(action: () => void) {
    return () => {
      setOpen(false);
      action();
    };
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="overflow-hidden p-0 sm:max-w-xl"
      >
        <DialogTitle className="sr-only">Comandi</DialogTitle>
        <Command
          loop
          className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
        >
          <Command.Input
            placeholder="Cerca note o digita un comando…"
            className="w-full border-b border-border bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              Nessun risultato.
            </Command.Empty>

            <Command.Group heading="Azioni">
              <PaletteItem
                onSelect={run(() => {
                  const id = createNote(notebooks[0]?.id ?? null);
                  router.push(`/note/${id}`);
                })}
              >
                <Plus className="size-4" /> Nuova lezione
              </PaletteItem>
              <PaletteItem
                onSelect={run(() =>
                  openSubjectDialog({ open: true, editingId: null }),
                )}
              >
                <FolderPlus className="size-4" /> Nuova materia
              </PaletteItem>
              <PaletteItem onSelect={run(() => router.push("/app"))}>
                <Home className="size-4" /> Vai alla dashboard
              </PaletteItem>
              <PaletteItem onSelect={run(() => router.push("/review"))}>
                <Brain className="size-4" /> Ripassa flashcard
                {due.length > 0 && (
                  <span className="ml-auto rounded-full bg-primary/10 px-1.5 text-xs text-primary">
                    {due.length}
                  </span>
                )}
              </PaletteItem>
              {onNote && (
                <PaletteItem
                  onSelect={run(() => {
                    void (async () => {
                      const ok = await downloadNotePdf();
                      if (!ok) printNoteToPdf();
                    })();
                  })}
                >
                  <FileDown className="size-4" /> Esporta PDF
                </PaletteItem>
              )}
              <PaletteItem onSelect={run(() => setZen((z) => !z))}>
                <Maximize2 className="size-4" /> Attiva/disattiva Zen Mode
              </PaletteItem>
              <PaletteItem onSelect={run(() => setOnboardingDone(false))}>
                <Sparkles className="size-4" /> Mostra introduzione
              </PaletteItem>
              <PaletteItem
                onSelect={run(() =>
                  setTheme(resolvedTheme === "dark" ? "light" : "dark"),
                )}
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="size-4" />
                ) : (
                  <Moon className="size-4" />
                )}
                Cambia tema
              </PaletteItem>
            </Command.Group>

            {notes.length > 0 && (
              <Command.Group heading="Lezioni">
                {notes.map((note) => {
                  const subject = notebooks.find(
                    (nb) => nb.id === note.notebookId,
                  );
                  return (
                    <PaletteItem
                      key={note.id}
                      value={`lezione ${note.title} ${subject?.name ?? ""} ${note.id}`}
                      onSelect={run(() => router.push(`/note/${note.id}`))}
                    >
                      <FileText className="size-4 opacity-70" />
                      <span className="truncate">{note.title}</span>
                      {subject && (
                        <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                          <SubjectGlyph color={subject.color} icon={subject.icon} />
                          <span className="max-w-28 truncate">{subject.name}</span>
                        </span>
                      )}
                    </PaletteItem>
                  );
                })}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

/** Styled cmdk item — keeps the markup in the palette readable. */
function PaletteItem({
  children,
  onSelect,
  value,
}: {
  children: React.ReactNode;
  onSelect: () => void;
  value?: string;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
    >
      {children}
    </Command.Item>
  );
}
