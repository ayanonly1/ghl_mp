"use client";

import { useEffect, useState } from "react";

export default function AuthConnectorPage() {
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [message, setMessage] = useState("Connecting session…");

  useEffect(() => {
    const isPopup = typeof window !== "undefined" && window.opener != null;
    if (!isPopup) {
      setStatus("error");
      setMessage("This page should be opened as a popup from the app.");
      return;
    }

    fetch("/api/session-token", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("No session"))))
      .then((data: { token?: string }) => {
        const token = data?.token;
        if (!token || typeof token !== "string") {
          throw new Error("No token in response");
        }
        try {
          window.opener.postMessage(
            { type: "ghl_session_token", token },
            new URL("/custom-page", window.location.origin).origin
          );
        } catch {
          // origin might differ in dev (e.g. port)
          window.opener.postMessage({ type: "ghl_session_token", token }, "*");
        }
        setStatus("done");
        setMessage("Connected. You can close this window.");
        window.close();
      })
      .catch(() => {
        setStatus("error");
        setMessage("Could not get session. Complete sign-in in the popup, then try Connect again.");
      });
  }, []);

  return (
    <div className="page-container" style={{ padding: "2rem", textAlign: "center" }}>
      <p>{message}</p>
      {status === "loading" && <p className="muted">Please wait…</p>}
      {status === "error" && (
        <button type="button" className="btn btn-primary" onClick={() => window.close()}>
          Close window
        </button>
      )}
    </div>
  );
}
