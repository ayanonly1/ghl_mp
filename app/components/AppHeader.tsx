"use client";

import { useState, useEffect, useCallback } from "react";
const LOGO_STORAGE_KEY = "mcp-registry-logo-url";
const DEFAULT_LOGO = "/logo.svg";

export function AppHeader() {
  const [logoUrl, setLogoUrl] = useState<string>(DEFAULT_LOGO);
  const [modalOpen, setModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(LOGO_STORAGE_KEY);
    if (stored) setLogoUrl(stored);
  }, []);

  const persistLogo = useCallback((url: string) => {
    if (typeof window === "undefined") return;
    if (url) {
      localStorage.setItem(LOGO_STORAGE_KEY, url);
      setLogoUrl(url);
      setLogoError(false);
    } else {
      localStorage.removeItem(LOGO_STORAGE_KEY);
      setLogoUrl(DEFAULT_LOGO);
    }
  }, []);

  const openModal = () => {
    setInputValue(logoUrl === DEFAULT_LOGO ? "" : logoUrl);
    setLogoError(false);
    setModalOpen(true);
  };

  const handleSave = () => {
    const value = inputValue.trim();
    if (!value) {
      persistLogo("");
      setModalOpen(false);
      return;
    }
    // Allow data URLs (from file upload) or http(s) or relative paths
    const isValid =
      value.startsWith("data:") ||
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("/");
    if (!isValid) {
      setLogoError(true);
      return;
    }
    persistLogo(value);
    setModalOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setInputValue(dataUrl);
      setLogoError(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleReset = () => {
    setInputValue("");
    persistLogo("");
    setModalOpen(false);
  };

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <a href="/" className="app-logo-link" aria-label="MCP Registry home">
            <img
              src={logoUrl}
              alt="MCP Registry"
              className="app-logo-img"
              onError={() => setLogoUrl(DEFAULT_LOGO)}
            />
            <span className="app-logo-text">MCP Registry</span>
          </a>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={openModal}
            aria-label="Change logo"
          >
            Change logo
          </button>
        </div>
      </header>

      {modalOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logo-modal-title"
          onClick={() => setModalOpen(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 id="logo-modal-title">Change logo</h3>
            <p className="muted" style={{ margin: "0 0 1rem 0" }}>
              Enter a URL or upload an image. Leave empty to use the default logo.
            </p>
            <input
              type="text"
              className="input"
              placeholder="https://… or /logo.png"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setLogoError(false);
              }}
              aria-invalid={logoError ? "true" : undefined}
            />
            {logoError && (
              <p className="muted" style={{ margin: "0.5rem 0 0", color: "var(--color-error)" }}>
                Please enter a valid URL or path, or upload an image.
              </p>
            )}
            <div style={{ marginTop: "0.75rem" }}>
              <label className="btn btn-secondary" style={{ cursor: "pointer", marginBottom: 0 }}>
                Upload image
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                  aria-label="Upload logo image"
                />
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={handleReset}>
                Reset to default
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSave}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
