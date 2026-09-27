// Configuration resolution:
// 1. window.__APP_CONFIG__ (optional runtime override, e.g. Docker container injection)
// 2. import.meta.env (.env file at build/dev time)

interface AppConfig {
  CS2_DOWNLOAD_URL: string;
  /** Base URL for Axios AJAX requests. Empty string "" in dev proxy mode, or backend URL in production. */
  API_BASE_URL: string;
  /** Actual backend server origin. Used for full-browser OAuth redirects. */
  BACKEND_URL: string;
}

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<AppConfig>;
  }
}

export const config: AppConfig = {
  CS2_DOWNLOAD_URL: window.__APP_CONFIG__?.CS2_DOWNLOAD_URL || (import.meta.env.VITE_CS2_DOWNLOAD_URL as string | undefined) || "https://github.com/Necko1/necko7-cs2i/releases/latest/download/necko7-cs2i-windows-x64-setup.exe",
  API_BASE_URL:
    window.__APP_CONFIG__?.API_BASE_URL ||
    (import.meta.env.API_BASE_URL as string | undefined) ||
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
    "",
  BACKEND_URL:
    window.__APP_CONFIG__?.BACKEND_URL ||
    (import.meta.env.BACKEND_URL as string | undefined) ||
    (import.meta.env.VITE_BACKEND_URL as string | undefined) ||
    "",
};
