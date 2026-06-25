"use client"; // Error boundaries must be Client Components

/**
 * Last-resort fallback when even the root layout (ClerkProvider, fonts,
 * providers) throws. Must define its own <html>/<body> — it replaces the
 * root layout entirely — so it can't rely on globals.css/Tailwind and uses
 * inline styles instead.
 */
export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="it">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: 24,
          textAlign: "center",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: "#1c1917",
        }}
      >
        <p style={{ fontWeight: 600, fontSize: 14 }}>Qualcosa è andato storto.</p>
        <p style={{ fontSize: 14, color: "#78716c", maxWidth: 320 }}>
          Riprova — se il problema persiste, ricarica la pagina.
        </p>
        <button
          onClick={() => unstable_retry()}
          style={{
            fontSize: 14,
            padding: "6px 14px",
            borderRadius: 6,
            border: "1px solid #d6d3d1",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Riprova
        </button>
      </body>
    </html>
  );
}
