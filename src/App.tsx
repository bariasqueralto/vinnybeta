import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();
const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();

const AppContent = () => (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <GoogleOAuthProvider clientId={googleClientId || 'placeholder.apps.googleusercontent.com'}>
      <AppContent />
    </GoogleOAuthProvider>
  </QueryClientProvider>
);

export default App;
