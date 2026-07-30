import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import App from "./app";
import "./index.css";

function SimpleError({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div style={{ padding: 20, textAlign: "center" }}>
      <h2>Something went wrong</h2>
      <pre style={{ color: "red", fontSize: 12 }}>{error.message}</pre>
      <button onClick={resetErrorBoundary} style={{ marginTop: 10, padding: "8px 16px" }}>Try again</button>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename="/">
      <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <SimpleError error={error} resetErrorBoundary={resetErrorBoundary} />}>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
);
