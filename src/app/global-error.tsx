"use client";

/**
 * Fallback при грешка в самия root layout (когато обикновеният error.tsx не може да
 * се монтира). Трябва да рендерира собствени <html>/<body>. Държим го самостоятелен
 * (inline стилове), защото глобалните стилове/шрифтове може да не са налични тук.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="bg">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4efe9",
          color: "#2b2b2b",
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.75rem", margin: "0 0 12px" }}>Нещо се обърка.</h1>
          <p style={{ color: "#6b6359", margin: "0 0 24px" }}>
            Опитай да презаредиш страницата. Ако проблемът продължи, обади ни се.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#2b2b2b",
              color: "#fff",
              border: "none",
              borderRadius: "999px",
              padding: "10px 24px",
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            Опитай пак
          </button>
        </div>
      </body>
    </html>
  );
}
