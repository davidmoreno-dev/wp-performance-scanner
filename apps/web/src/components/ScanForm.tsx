"use client";

import { useState, useTransition } from "react";
import { createScan } from "@/app/actions/create-scan";

interface ScanFormProps {
  onScanCreated?: (data: {
    id: string;
    public_token: string;
    original_url: string;
    normalized_url: string;
    status: string;
  }) => void;
}

export function ScanForm({ onScanCreated }: ScanFormProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("url", url);

    startTransition(async () => {
      const result = await createScan(formData);

      if (!result.success && result.error) {
        setError(result.error.message);
        return;
      }

      if (result.success && result.data) {
        setUrl("");
        setError(null);
        onScanCreated?.(result.data);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <div style={inputGroupStyle}>
        <label htmlFor="url-input" style={labelStyle}>
          WordPress URL
        </label>
        <div style={inputWrapperStyle}>
          <input
            id="url-input"
            name="url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            style={inputStyle}
            disabled={isPending}
            autoComplete="url"
            spellCheck={false}
          />
          <button
            type="submit"
            style={{
              ...buttonStyle,
              opacity: isPending ? 0.6 : 1,
              cursor: isPending ? "not-allowed" : "pointer"
            }}
            disabled={isPending || !url.trim()}
          >
            {isPending ? "Creating..." : "Scan"}
          </button>
        </div>
      </div>

      {error && (
        <div style={errorStyle} role="alert">
          {error}
        </div>
      )}

      <p style={hintStyle}>
        Enter the full URL of a WordPress site to analyze its performance.
      </p>
    </form>
  );
}

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px"
};

const inputGroupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px"
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "#374151"
};

const inputWrapperStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px"
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "12px 16px",
  fontSize: "1rem",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  outline: "none",
  transition: "border-color 0.15s"
};

const buttonStyle: React.CSSProperties = {
  padding: "12px 24px",
  fontSize: "1rem",
  fontWeight: 500,
  color: "#ffffff",
  backgroundColor: "#2563eb",
  border: "none",
  borderRadius: "8px",
  transition: "background-color 0.15s"
};

const errorStyle: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: "0.875rem",
  color: "#dc2626",
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px"
};

const hintStyle: React.CSSProperties = {
  fontSize: "0.8125rem",
  color: "#6b7280",
  margin: 0
};
