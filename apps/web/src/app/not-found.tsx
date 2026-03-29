import Link from "next/link";

export default function NotFound() {
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={numberStyle}>404</div>
        <h1 style={titleStyle}>Page not found</h1>
        <p style={messageStyle}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link href="/" style={buttonStyle}>
          Go to homepage
        </Link>
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

const numberStyle: React.CSSProperties = {
  fontSize: "4rem",
  fontWeight: 800,
  color: "#e5e7eb",
  lineHeight: 1,
  margin: "0 0 8px",
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

const buttonStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 20px",
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "#ffffff",
  backgroundColor: "#2563eb",
  borderRadius: "8px",
  textDecoration: "none",
};
