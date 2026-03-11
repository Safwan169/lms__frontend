// src/middlewares/reduxLogger.ts
import { Middleware } from "@reduxjs/toolkit";

export const reduxLogger: Middleware = (store) => (next) => (action : any) => {
  if (process.env.NODE_ENV === "development") {
    console.groupCollapsed(`action: ${action.type}`);
    console.log("prev:", store.getState());
    console.log("action:", action);
  }
  const result = next(action);
  if (process.env.NODE_ENV === "development") {
    console.log("next:", store.getState());
    console.groupEnd();
  }
  return result;
};
