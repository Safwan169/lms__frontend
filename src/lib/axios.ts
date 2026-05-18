// src/lib/axios.ts
import axios from "axios";
import toast from "react-hot-toast";

function resolveErrorMessage(error: any) {
  const data = error?.response?.data
  const validationErrors = Array.isArray(data?.errors)
    ? data.errors.filter((item: unknown) => typeof item === "string" && item.trim().length > 0)
    : []

  if (validationErrors.length > 0) {
    return validationErrors[0]
  }

  return data?.message ?? error?.message ?? "Something went wrong"
}

function resolveApiBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? ""
  const trimmed = raw.replace(/\/+$/, "")
  return trimmed.replace(/\/api$/i, "")
}

function normalizeApiPath(url: string) {
  if (!url) return url
  if (/^https?:\/\//i.test(url)) return url

  const normalized = `/${url.replace(/^\/+/, "")}`
  if (normalized === "/api") return "/api"
  if (normalized.startsWith("/api/")) return normalized.replace(/^\/api\/api\//i, "/api/")
  return `/api${normalized}`
}

const instance = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: { "Content-Type": "application/json" }
});

// Request interceptor to attach token (example)
instance.interceptors.request.use(
  (config :any) => {
    try {
      const isFormData =
        typeof FormData !== "undefined" && config?.data instanceof FormData

      if (isFormData) {
        if (config.headers) {
          delete config.headers["Content-Type"]
          delete config.headers["content-type"]
        }
      } else {
        config.headers = {
          ...config.headers,
          "Content-Type": config.headers?.["Content-Type"] ?? "application/json",
        }
      }

      if (typeof window !== "undefined") {
        const token = localStorage.getItem("access_token");
        if (token) config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
      }

      if (typeof config?.url === "string") {
        config.url = normalizeApiPath(config.url)
      }
    } catch (e) { /* ignore */ }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptors for global error handling
instance.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const message = resolveErrorMessage(error);

    if (status === 401 && typeof window !== "undefined") {
      try {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
      } catch {
        // Ignore storage cleanup errors and continue logout flow.
      }

      if (window.location.pathname !== "/login") {
        toast.error("Session expired. Please log in again.");
        window.location.replace("/login");
      }

      return Promise.reject(error);
    }

    // Allow callers to opt-out of the global toast by passing { _suppressToast: true } in axios config
    if ((error.config as any)?._suppressToast) {
      return Promise.reject(error);
    }

    // Show toast globally
    toast.error(message);
    return Promise.reject(error);
  }
);

export default instance;
