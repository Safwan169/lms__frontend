// src/lib/axios.ts
import axios from "axios";
import toast from "react-hot-toast";

const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  headers: { "Content-Type": "application/json" }
});

// Request interceptor to attach token (example)
instance.interceptors.request.use(
  (config :any) => {
    try {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("access_token");
        if (token) config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
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
    const message = error.response?.data?.message ?? error.message ?? "Something went wrong";
    // Show toast globally
    toast.error(message);
    return Promise.reject(error);
  }
);

export default instance;
