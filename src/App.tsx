import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
// Homepage stays eager — it's the LCP-critical route.
import Index from "./pages/Index.tsx";

// All other routes are split into separate chunks to keep the initial JS bundle small.
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const AdminDns = lazy(() => import("./pages/AdminDns.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const RuPage = lazy(() => import("./pages/LangComingSoon.tsx").then(m => ({ default: m.RuPage })));
const EnPage = lazy(() => import("./pages/LangComingSoon.tsx").then(m => ({ default: m.EnPage })));
const FrPage = lazy(() => import("./pages/LangComingSoon.tsx").then(m => ({ default: m.FrPage })));
const PergolaApproval = lazy(() => import("./pages/PergolaApproval.tsx"));
const InteriorChanges = lazy(() => import("./pages/InteriorChanges.tsx"));
const BuildingReinforcement = lazy(() => import("./pages/BuildingReinforcement.tsx"));
const Mamad = lazy(() => import("./pages/Mamad.tsx"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage.tsx"));
const AreasIndex = lazy(() => import("./pages/AreasIndex.tsx"));
const AreaPage = lazy(() => import("./pages/AreaPage.tsx"));
const WhatIsKonstruktor = lazy(() => import("./pages/WhatIsKonstruktor.tsx"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/index" element={<Navigate to="/" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/ru" element={<RuPage />} />
              <Route path="/en" element={<EnPage />} />
              <Route path="/fr" element={<FrPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/services/pergola-approval" element={<PergolaApproval />} />
              <Route path="/אישור-פרגולה" element={<Navigate to="/services/pergola-approval" replace />} />
              <Route path="/services/interior-changes" element={<InteriorChanges />} />
              <Route path="/services/building-reinforcement" element={<BuildingReinforcement />} />
              <Route path="/services/mamad" element={<Mamad />} />
              <Route path="/areas" element={<AreasIndex />} />
              <Route path="/areas/:slug" element={<AreaPage />} />
              <Route path="/articles/what-is-konstruktor" element={<WhatIsKonstruktor />} />
              <Route
                path="/admin/dns"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminDns />
                  </ProtectedRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
