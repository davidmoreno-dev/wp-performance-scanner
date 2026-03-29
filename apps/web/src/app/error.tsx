"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={iconStyle}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 style={titleStyle}>Something went wrong</h1>
        <p style={messageStyle}>
          {error.digest === "NEXT_NOT_FOUND" || error.message.includes("not found")
            ? "The page you're looking for doesn't exist."
            : "An unexpected error occurred. Please try again."}
        </p>
        <div style={actionsStyle}>
          <button onClick={reset} style={primaryButtonStyle}>
            Try again
          </button>
          <a href="/" style={linkStyle}>
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#f9fafb",
  padding: "24px",
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  padding: "48px",
  textAlign: "center",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  maxWidth: "400px",
  width: "100%",
};

const iconStyle: React.CSSProperties = {
  width: "64px",
  height: "64px",
  borderRadius: "50%",
  backgroundColor: "#fee2e2",
  color: "#ef4444",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 16px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 700,
  color: "#111827",
  margin: "0 0 8px",
};

const messageStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "#6b7280",
  margin: "0 0 24px",
  lineHeight: 1.5,
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  justifyContent: "center",
  flexWrap: "wrap",
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "10px 20px",
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "#ffffff",
  backgroundColor: "#2563eb",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};

const linkStyle: React.CSSProperties = {
  padding: "10px 20px",
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "#6b7280",
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  textDecoration: "none",
  display: "inline-block",
};
