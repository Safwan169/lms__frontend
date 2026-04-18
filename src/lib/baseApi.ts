// src/lib/baseApi.ts
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";

function resolveApiBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089"
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

const rawBaseQuery = fetchBaseQuery({
  baseUrl: resolveApiBaseUrl(),
  prepareHeaders: (headers) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }
    headers.set("accept", "application/json");
    return headers;
  }
})

const baseQueryWithApiPrefix: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = (args, api, extraOptions) => {
  if (typeof args === "string") {
    return rawBaseQuery(normalizeApiPath(args), api, extraOptions)
  }

  const nextArgs: FetchArgs = {
    ...args,
    url: normalizeApiPath(String(args.url ?? "")),
  }

  return rawBaseQuery(nextArgs, api, extraOptions)
}

export const baseApi = createApi({
  reducerPath: "baseApi",
  baseQuery: baseQueryWithApiPrefix,
  tagTypes: ["User"],
  endpoints: () => ({}) 
});
