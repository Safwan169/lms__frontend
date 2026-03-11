"use client";

import { Provider as ReduxProvider } from "react-redux";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "@/context/AuthContext";
import { store } from "@/store/store";
import ToasterProvider from "@/components/ToasterProvider";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToasterProvider />
          {children}
        </AuthProvider>
      </QueryClientProvider>
    </ReduxProvider>
  );
}

export default Providers;
