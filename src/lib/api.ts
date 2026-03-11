// src/lib/api.ts
import axios from "./axios";

export const api = {
  get: (url: string, config?: any) => axios.get(url, config),
  post: (url: string, data?: any, config?: any) => axios.post(url, data, config),
  put: (url: string, data?: any, config?: any) => axios.put(url, data, config),
  delete: (url: string, config?: any) => axios.delete(url, config),
};

export default api;
