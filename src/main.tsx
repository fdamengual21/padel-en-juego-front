import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MockSessionProvider } from "@/app/MockSessionProvider";
import { UserProvider } from "@/app/UserProvider";
import Toaster from "@/components/ui/toaster";
import AppRouter from "@/router/AppRouter";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      retry: 0,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <MockSessionProvider>
          <AppRouter />
          <Toaster />
        </MockSessionProvider>
      </UserProvider>
    </QueryClientProvider>
  </StrictMode>,
);
