import axios from "axios";
import { config } from "@/config";

export const api = axios.create({
  baseURL: config.API_BASE_URL,
  withCredentials: true, // send session_id cookie automatically
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Axios interceptor — only handles 401 globally by hard-redirecting to /login.
 *
 * 404 handling (bot not initialized) is intentionally done in React components
 * via useQuery's error state + <Navigate />, because window.location.href
 * from an interceptor races with React Router and can cause inconsistent behavior.
 *
 * Note: the AppLayout and AuthLayout both probe GET /api/v1/users/me and
 * handle 404 → /init-bot and 401 → /login respectively via React Router.
 * The 401 intercept here is a fallback for any other protected endpoint that
 * might fire after session expiry (e.g. a background refetch).
 */
let isRedirecting = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isRedirecting) return Promise.reject(error);

    const status = error?.response?.status;

    // Only redirect on 401 when the user is inside a protected route and session expires.
    // If user is already on /login or /init-bot, NEVER reload the page!
    if (status === 401) {
      const path = window.location.pathname;
      if (!path.startsWith("/login") && !path.startsWith("/init-bot")) {
        isRedirecting = true;
        setTimeout(() => {
          window.location.href = "/login";
          isRedirecting = false;
        }, 50);
      }
    }

    return Promise.reject(error);
  }
);
