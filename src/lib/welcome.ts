"use client";

import type { createStore } from "jotai";
import type { BlockNoteDocument, Note, Notebook } from "@/lib/types";
import { notebooksAtom, notesAtom } from "@/lib/store/atoms";
import { colorForIndex } from "@/lib/subjects";

type JotaiStore = ReturnType<typeof createStore>;

// --- Block helpers (BlockNote PartialBlock JSON) ----------------------------

function p(text: string, bold = false): unknown {
  return {
    type: "paragraph",
    content: [{ type: "text", text, styles: bold ? { bold: true } : {} }],
  };
}

function h(level: 1 | 2, text: string): unknown {
  return {
    type: "heading",
    props: { level },
    content: [{ type: "text", text, styles: {} }],
  };
}

/** The contents of the welcome note — a hands-on tour of every block type. */
function welcomeDocument(): BlockNoteDocument {
  return [
    h(1, "Benvenuto in MattNotes 👋"),
    p(
      "Questo è il tuo quaderno di benvenuto: una guida rapida e interattiva. Modificalo o eliminalo pure quando vuoi.",
    ),

    h(2, "✍️ Scrivere"),
    p(
      "Scrivi come in un normale editor. Premi «/» per inserire blocchi speciali: titoli, elenchi, formule, canvas e codice.",
    ),

    h(2, "∫ Formule LaTeX"),
    p("Le formule si scrivono in LaTeX e si vedono renderizzate al volo (doppio clic per modificarle):"),
    {
      type: "latex",
      props: { code: "\\int_0^{\\infty} e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2}", display: true },
    },

    h(2, "✏️ Canvas (Apple Pencil)"),
    p("Disegna schemi e dimostrazioni a mano libera. Doppio clic sul canvas qui sotto per iniziare:"),
    { type: "canvas", props: { snapshot: "", height: 280 } },

    h(2, "🐍 Codice Python eseguibile"),
    p("Esegui Python direttamente nel browser. Premi «Esegui» nel blocco qui sotto:"),
    {
      type: "codeCell",
      props: {
        code: "import math\nfor i in range(1, 6):\n    print(i, '!=', math.factorial(i))",
        language: "python",
      },
    },

    h(2, "🤖 Assistente AI (in locale)"),
    p(
      "Apri il pannello a destra per chiedere spiegazioni o generare esercizi. Gira in locale con Ollama: nessun dato lascia il tuo computer.",
    ),

    h(2, "🔁 Flashcard e ripasso"),
    p(
      "Da una nota puoi generare flashcard con «Genera flashcard» e ripassarle con la ripetizione spaziata dalla sezione Ripassa.",
    ),

    h(2, "📄 Esporta e organizza"),
    p(
      "Usa «Esporta PDF» per salvare la lezione in A4. Trascina materie e lezioni nella barra laterale per riordinarle.",
    ),

    p("Buono studio! ✨", true),
  ] as BlockNoteDocument;
}

/**
 * Seed a brand-new account with a single welcome notebook. Called after the
 * initial cloud pull: only runs when the account has no data, so it fires once
 * per account (the welcome note is then synced like any other).
 */
export function maybeSeedWelcome(store: JotaiStore): void {
  if (store.get(notebooksAtom).length > 0 || store.get(notesAtom).length > 0) {
    return;
  }
  const ts = new Date().toISOString();
  const notebookId = crypto.randomUUID();

  const notebook: Notebook = {
    id: notebookId,
    name: "Guida",
    color: colorForIndex(0),
    icon: "👋",
    parentId: null,
    order: 0,
    createdAt: ts,
    updatedAt: ts,
  };
  const note: Note = {
    id: crypto.randomUUID(),
    notebookId,
    title: "Benvenuto in MattNotes 👋",
    content: welcomeDocument(),
    order: 0,
    createdAt: ts,
    updatedAt: ts,
    syncStatus: "local",
  };

  store.set(notebooksAtom, [notebook]);
  store.set(notesAtom, [note]);
}
