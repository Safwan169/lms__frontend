import { Middleware } from "@reduxjs/toolkit";

export const authMiddleware: Middleware =
  () => (next) => (action) => {
    if (
      typeof action === "object" &&
      action !== null &&
      "type" in action &&
      action.type === "user/clearUser"
    ) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
    }

    return next(action);
  };
