"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAtomValue, useSetAtom } from "jotai";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  ChevronRight,
  GripVertical,
  MoreHorizontal,
  Palette,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Note, Notebook } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  applyNotesOrderAtom,
  createNoteAtom,
  deleteNotebookAtom,
  notebooksAtom,
  notesAtom,
  reorderNotebooksAtom,
  subjectDialogAtom,
} from "@/lib/store/atoms";
import { NoteItem } from "@/components/sidebar/note-item";
import { SubjectGlyph } from "@/components/sidebar/subject-glyph";

// Container key for lessons that don't belong to any subject.
const ORPHAN = "__orphan__";
// Prefixes keep subject, note and container ids distinct inside one DndContext.
const noteSid = (id: string) => `note:${id}`;
const rawNoteId = (sid: string) => sid.slice("note:".length);
const subSid = (id: string) => `sub:${id}`;
const contId = (key: string) => `cont:${key}`;

type Containers = Record<string, string[]>;

/**
 * Scopes drop targets by what's being dragged: a subject only collides with
 * other subjects (so its tall group can't resolve to a nested lesson), while a
 * lesson collides only with lesson containers/items.
 */
const scopedCollision: CollisionDetection = (args) => {
  const activeType = args.active.data.current?.type;
  const droppableContainers = args.droppableContainers.filter((c) =>
    activeType === "subject"
      ? c.data.current?.type === "subject"
      : c.data.current?.type !== "subject",
  );
  return closestCorners({ ...args, droppableContainers });
};

/**
 * Subject-first navigation tree with drag & drop (powered by @dnd-kit):
 * subjects can be reordered, and lessons can be reordered or dragged between
 * subjects (and to "Senza materia"). Drag & drop is disabled while searching,
 * which filters lessons by title across all subjects.
 */
export function SubjectTree() {
  const router = useRouter();
  const notebooks = useAtomValue(notebooksAtom);
  const notes = useAtomValue(notesAtom);
  const createNote = useSetAtom(createNoteAtom);
  const openSubjectDialog = useSetAtom(subjectDialogAtom);
  const reorderNotebooks = useSetAtom(reorderNotebooksAtom);
  const applyNotesOrder = useSetAtom(applyNotesOrderAtom);

  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const dndEnabled = q === "";

  const sortedSubjects = useMemo(
    () => [...notebooks].sort((a, b) => a.order - b.order),
    [notebooks],
  );
  const noteById = useMemo(() => new Map(notes.map((n) => [n.id, n])), [notes]);

  // Lessons grouped into ordered containers (one per subject + orphans). This is
  // local working state so items can physically move between lists mid-drag; it
  // is rebuilt from the store whenever the store changes and we're not dragging.
  const buildContainers = useCallback((): Containers => {
    const map: Containers = { [ORPHAN]: [] };
    for (const nb of notebooks) map[nb.id] = [];
    for (const n of [...notes].sort((a, b) => a.order - b.order)) {
      // Notes whose subject no longer exists fall back to "Senza materia" so
      // they're never hidden.
      const key = n.notebookId && n.notebookId in map ? n.notebookId : ORPHAN;
      map[key].push(noteSid(n.id));
    }
    return map;
  }, [notebooks, notes]);

  // When idle, the layout is derived straight from the store. During a drag we
  // hold a working snapshot (so lessons can move between lists), committed on
  // drop. `containersRef` is the source of truth inside drag handlers.
  const [dragContainers, setDragContainers] = useState<Containers | null>(null);
  const containers = dragContainers ?? buildContainers();
  const containersRef = useRef<Containers>(containers);

  function setDrag(next: Containers) {
    containersRef.current = next;
    setDragContainers(next);
  }

  function endDrag() {
    setActiveId(null);
    setDragContainers(null);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function findContainer(id: string): string | null {
    if (id.startsWith("cont:")) return id.slice("cont:".length);
    if (id.startsWith("note:")) {
      return (
        Object.keys(containersRef.current).find((k) =>
          containersRef.current[k].includes(id),
        ) ?? null
      );
    }
    return null;
  }

  function handleDragStart(e: DragStartEvent) {
    const base = buildContainers();
    containersRef.current = base;
    setDragContainers(base);
    setActiveId(e.active.id as string);
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const aId = active.id as string;
    const oId = over.id as string;
    if (!aId.startsWith("note:")) return; // only lessons cross containers

    const from = findContainer(aId);
    const to = findContainer(oId);
    if (!from || !to || from === to) return;

    const prev = containersRef.current;
    const fromArr = [...prev[from]];
    const toArr = [...prev[to]];
    const fromIdx = fromArr.indexOf(aId);
    if (fromIdx < 0) return;
    fromArr.splice(fromIdx, 1);

    let insertAt = toArr.length;
    if (oId.startsWith("note:")) {
      const overIdx = toArr.indexOf(oId);
      if (overIdx >= 0) insertAt = overIdx;
    }
    toArr.splice(insertAt, 0, aId);
    setDrag({ ...prev, [from]: fromArr, [to]: toArr });
  }

  function commit(map: Containers) {
    const updates: { id: string; notebookId: string | null; order: number }[] =
      [];
    for (const key of Object.keys(map)) {
      const notebookId = key === ORPHAN ? null : key;
      map[key].forEach((sid, index) =>
        updates.push({ id: rawNoteId(sid), notebookId, order: index }),
      );
    }
    applyNotesOrder(updates);
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    const aId = active.id as string;
    const oId = over?.id as string | undefined;

    // Reorder subjects.
    if (aId.startsWith("sub:")) {
      endDrag();
      if (!oId?.startsWith("sub:")) return;
      const ids = sortedSubjects.map((s) => s.id);
      const oldIndex = ids.indexOf(aId.slice("sub:".length));
      const newIndex = ids.indexOf(oId.slice("sub:".length));
      if (oldIndex !== newIndex && oldIndex >= 0 && newIndex >= 0) {
        reorderNotebooks(arrayMove(ids, oldIndex, newIndex));
      }
      return;
    }

    // Finalize a lesson's position within its (possibly new) container.
    if (aId.startsWith("note:")) {
      const container = oId ? findContainer(aId) : null;
      // `oId` on a header is a no-op; otherwise commit the working layout.
      if (container && !oId!.startsWith("sub:")) {
        const arr = [...containersRef.current[container]];
        const oldIndex = arr.indexOf(aId);
        let newIndex = arr.length - 1;
        if (oId!.startsWith("note:") && findContainer(oId!) === container) {
          const idx = arr.indexOf(oId!);
          if (idx >= 0) newIndex = idx;
        }
        const next = {
          ...containersRef.current,
          [container]:
            oldIndex >= 0 && newIndex >= 0
              ? arrayMove(arr, oldIndex, newIndex)
              : arr,
        };
        commit(next);
      }
      endDrag();
    }
  }

  function handleDragCancel() {
    endDrag();
  }

  function addLesson(notebookId: string) {
    const id = createNote(notebookId);
    setCollapsed((c) => ({ ...c, [notebookId]: false }));
    router.push(`/note/${id}`);
  }

  const matches = (title: string) => title.toLowerCase().includes(q);

  const orphanSids = (containers[ORPHAN] ?? []).filter((sid) => {
    const note = noteById.get(rawNoteId(sid));
    return note && (!q || matches(note.title));
  });

  // The label shown floating under the cursor while dragging.
  const activeLabel = activeId?.startsWith("sub:")
    ? notebooks.find((nb) => nb.id === activeId.slice(4))?.name
    : activeId?.startsWith("note:")
      ? noteById.get(rawNoteId(activeId))?.title
      : null;

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca lezioni…"
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pb-1">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Materie
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Nuova materia"
          onClick={() => openSubjectDialog({ open: true, editingId: null })}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2">
        <DndContext
          sensors={sensors}
          collisionDetection={scopedCollision}
          modifiers={[restrictToVerticalAxis]}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="space-y-0.5 pb-4">
            <SortableContext
              items={sortedSubjects.map((s) => subSid(s.id))}
              strategy={verticalListSortingStrategy}
            >
              {sortedSubjects.map((subject) => {
                const lessonSids = containers[subject.id] ?? [];
                const visibleSids = lessonSids.filter((sid) => {
                  const note = noteById.get(rawNoteId(sid));
                  return note && (!q || matches(note.title));
                });

                // While searching, hide subjects with no matching lessons.
                if (q && visibleSids.length === 0) return null;
                const isCollapsed = collapsed[subject.id] && !q;

                return (
                  <SortableSubjectRow
                    key={subject.id}
                    subject={subject}
                    dndEnabled={dndEnabled}
                  >
                    {(handle) => (
                      <>
                        <SubjectRow
                          subject={subject}
                          count={visibleSids.length}
                          collapsed={isCollapsed}
                          dragHandle={handle}
                          onToggle={() =>
                            setCollapsed((c) => ({
                              ...c,
                              [subject.id]: !c[subject.id],
                            }))
                          }
                          onAddLesson={() => addLesson(subject.id)}
                        />
                        {!isCollapsed && (
                          <NoteList
                            containerKey={subject.id}
                            itemSids={lessonSids}
                          >
                            {visibleSids.length === 0 ? (
                              <button
                                onClick={() => addLesson(subject.id)}
                                className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                              >
                                + Aggiungi lezione
                              </button>
                            ) : (
                              visibleSids.map((sid) => {
                                const note = noteById.get(rawNoteId(sid))!;
                                return (
                                  <SortableNoteItem
                                    key={note.id}
                                    note={note}
                                    dndEnabled={dndEnabled}
                                  />
                                );
                              })
                            )}
                          </NoteList>
                        )}
                      </>
                    )}
                  </SortableSubjectRow>
                );
              })}
            </SortableContext>

            {orphanSids.length > 0 && (
              <div className="pt-2">
                <span className="px-2 text-xs font-medium text-muted-foreground">
                  Senza materia
                </span>
                <NoteList
                  containerKey={ORPHAN}
                  itemSids={containers[ORPHAN] ?? []}
                >
                  {orphanSids.map((sid) => {
                    const note = noteById.get(rawNoteId(sid))!;
                    return (
                      <SortableNoteItem
                        key={note.id}
                        note={note}
                        dndEnabled={dndEnabled}
                      />
                    );
                  })}
                </NoteList>
              </div>
            )}

            {sortedSubjects.length === 0 && (
              <button
                onClick={() => openSubjectDialog({ open: true, editingId: null })}
                className="mx-2 mt-2 flex w-[calc(100%-1rem)] items-center gap-2 rounded-md border border-dashed border-sidebar-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <Plus className="size-4" /> Crea la prima materia
              </button>
            )}
          </div>

          <DragOverlay>
            {activeLabel ? (
              <div className="flex items-center gap-2 rounded-md border border-border bg-popover px-2.5 py-1.5 text-sm shadow-md">
                <GripVertical className="size-3.5 text-muted-foreground" />
                <span className="truncate">{activeLabel}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </ScrollArea>
    </div>
  );
}

/** Droppable + sortable container for a subject's (or the orphan) lessons. */
function NoteList({
  containerKey,
  itemSids,
  children,
}: {
  containerKey: string;
  itemSids: string[];
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: contId(containerKey),
    data: { type: "container" },
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "mb-1 ml-3.5 min-h-[1.75rem] rounded-sm border-l border-sidebar-border pl-1.5 transition-colors",
        isOver && "bg-sidebar-accent/40",
      )}
    >
      <SortableContext items={itemSids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </div>
  );
}

/** Wraps a subject group as a sortable item, exposing a drag handle to render. */
function SortableSubjectRow({
  subject,
  dndEnabled,
  children,
}: {
  subject: Notebook;
  dndEnabled: boolean;
  children: (handle: React.ReactNode) => React.ReactNode;
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    attributes,
    listeners,
  } = useSortable({
    id: subSid(subject.id),
    data: { type: "subject" },
    disabled: !dndEnabled,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handle = dndEnabled ? (
    <button
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label="Trascina per riordinare"
      className="flex size-5 cursor-grab touch-none items-center justify-center text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
    >
      <GripVertical className="size-3.5" />
    </button>
  ) : null;

  return (
    <div ref={setNodeRef} style={style}>
      {children(handle)}
    </div>
  );
}

/** Wraps a lesson as a sortable item with its own drag handle. */
function SortableNoteItem({
  note,
  dndEnabled,
}: {
  note: Note;
  dndEnabled: boolean;
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    attributes,
    listeners,
  } = useSortable({
    id: noteSid(note.id),
    data: { type: "note" },
    disabled: !dndEnabled,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handle = dndEnabled ? (
    <button
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label="Trascina per riordinare"
      className="flex size-4 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
    >
      <GripVertical className="size-3" />
    </button>
  ) : null;

  return (
    <div ref={setNodeRef} style={style}>
      <NoteItem note={note} dragHandle={handle} />
    </div>
  );
}

/** A single subject header row with its marker, count and actions. */
function SubjectRow({
  subject,
  count,
  collapsed,
  dragHandle,
  onToggle,
  onAddLesson,
}: {
  subject: Notebook;
  count: number;
  collapsed: boolean;
  dragHandle?: React.ReactNode;
  onToggle: () => void;
  onAddLesson: () => void;
}) {
  const openSubjectDialog = useSetAtom(subjectDialogAtom);
  const deleteNotebook = useSetAtom(deleteNotebookAtom);

  function handleDelete() {
    const ok = window.confirm(
      count > 0
        ? `Eliminare la materia "${subject.name}" e le sue ${count} lezioni?`
        : `Eliminare la materia "${subject.name}"?`,
    );
    if (!ok) return;
    deleteNotebook(subject.id);
    toast.success("Materia eliminata");
  }

  return (
    <div className="group flex items-center gap-1 rounded-md px-1.5 py-1 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50">
      {dragHandle}
      <button onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-1.5">
        <ChevronRight
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            !collapsed && "rotate-90",
          )}
        />
        <SubjectGlyph color={subject.color} icon={subject.icon} className="text-base" />
        <span className="truncate">{subject.name}</span>
        <span className="ml-1 shrink-0 text-xs font-normal text-muted-foreground">
          {count}
        </span>
      </button>

      <Button
        variant="ghost"
        size="icon-xs"
        className="opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Nuova lezione"
        onClick={onAddLesson}
      >
        <Plus className="size-3.5" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            className="opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
            aria-label="Azioni materia"
          >
            <MoreHorizontal className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onSelect={() =>
              openSubjectDialog({ open: true, editingId: subject.id })
            }
          >
            <Palette className="size-4" /> Modifica materia
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onAddLesson}>
            <Plus className="size-4" /> Nuova lezione
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={handleDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="size-4" /> Elimina materia
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
