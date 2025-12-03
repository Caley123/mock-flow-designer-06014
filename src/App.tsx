import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PageLoader } from "./components/ui/page-loader";
import { authService } from "./lib/services";
import { useSessionMonitor } from "./hooks/useSessionMonitor";

// Lazy loading de componentes para code splitting
const Login = lazy(() => import("./pages/Login").then(m => ({ default: m.Login })));
const Dashboard = lazy(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
const RegisterIncident = lazy(() => import("./pages/RegisterIncident").then(m => ({ default: m.RegisterIncident })));
const IncidentsList = lazy(() => import("./pages/IncidentsList").then(m => ({ default: m.IncidentsList })));
const StudentsList = lazy(() => import("./pages/StudentsList").then(m => ({ default: m.StudentsList })));
const FaultsCatalog = lazy(() => import("./pages/FaultsCatalog").then(m => ({ default: m.FaultsCatalog })));
const Reports = lazy(() => import("./pages/Reports").then(m => ({ default: m.Reports })));
const AttendanceReport = lazy(() => import("./pages/AttendanceReport").then(m => ({ default: m.AttendanceReport })));
const TutorScanner = lazy(() => import("./pages/TutorScanner").then(m => ({ default: m.TutorScanner })));
const AuditLogs = lazy(() => import("./pages/AuditLogs").then(m => ({ default: m.AuditLogs })));
const SystemConfig = lazy(() => import("./pages/SystemConfig").then(m => ({ default: m.SystemConfig })));
const ArrivalControl = lazy(() => import("./pages/ArrivalControl").then(m => ({ default: m.ArrivalControl })));
const ParentMeetings = lazy(() => import("./pages/ParentMeetings").then(m => ({ default: m.ParentMeetings })));
const ParentPortal = lazy(() => import("./pages/ParentPortal").then(m => ({ default: m.ParentPortal })));
const JustifyFaults = lazy(() => import("./pages/JustifyFaults").then(m => ({ default: m.JustifyFaults })));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutos de caché
    },
  },
});

// Componente para redirigir si ya está autenticado
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const user = authService.getCurrentUser();
  if (user) {
    return <Navigate to="/" replace />;
  }
  return children as React.ReactElement;
};

// Componente para manejar la ruta raíz - redirige según el rol
const RootRoute = () => {
  const user = authService.getCurrentUser();
  
  // Si no hay usuario, redirigir al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Si es tutor, redirigir a la página de escaneo
  if (user.role === 'Tutor') {
    return <Navigate to="/tutor-scanner" replace />;
  }
  
  // Si es padre, redirigir al portal de padres
  if (user.role === 'Padre') {
    return <Navigate to="/parent-portal" replace />;
  }
  
  // Para otros roles, redirigir al dashboard
  return <Navigate to="/dashboard" replace />;
};

// Componente de carga para Suspense
const LoadingFallback = () => <PageLoader message="Cargando..." />;

// Componente interno que usa el Router
const AppContent = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route 
                path="/login" 
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                } 
              />
              <Route 
                path="/" 
                element={<RootRoute />}
              />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Layout><Dashboard /></Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/tutor-scanner" 
                element={
                  <ProtectedRoute requiredRole={['Tutor']}>
                    <TutorScanner />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/register" 
                element={
                  <ProtectedRoute requiredRole={['Supervisor', 'Director', 'Admin']}>
                    <Layout><RegisterIncident /></Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/incidents" 
                element={
                  <ProtectedRoute requiredRole={['Supervisor', 'Director', 'Admin']}>
                    <Layout><IncidentsList /></Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/students" 
                element={
                  <ProtectedRoute requiredRole={['Supervisor', 'Director', 'Admin']}>
                    <Layout><StudentsList /></Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/faults" 
                element={
                  <ProtectedRoute requiredRole={['Director', 'Admin']}>
                    <Layout><FaultsCatalog /></Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/reports" 
                element={
                  <ProtectedRoute requiredRole={['Director', 'Admin']}>
                    <Layout><Reports /></Layout>
                  </ProtectedRoute>
                } 
              />
              <Route
                path="/attendance-report"
                element={
                  <ProtectedRoute requiredRole={['Supervisor', 'Director', 'Admin']}>
                    <Layout><AttendanceReport /></Layout>
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/audit" 
                element={
                  <ProtectedRoute requiredRole={['Admin']}>
                    <Layout><AuditLogs /></Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/system-config" 
                element={
                  <ProtectedRoute requiredRole={['Admin']}>
                    <Layout><SystemConfig /></Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/arrival-control" 
                element={
                  <ProtectedRoute requiredRole={['Supervisor', 'Director', 'Admin']}>
                    <Layout><ArrivalControl /></Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/parent-meetings" 
                element={
                  <ProtectedRoute requiredRole={['Supervisor', 'Director', 'Admin']}>
                    <Layout><ParentMeetings /></Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/parent-portal" 
                element={
                  <ProtectedRoute requiredRole={['Padre', 'Supervisor', 'Director', 'Admin']}>
                    <Layout><ParentPortal /></Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/justify-faults" 
                element={
                  <ProtectedRoute requiredRole={['Supervisor', 'Director', 'Admin']}>
                    <Layout><JustifyFaults /></Layout>
                  </ProtectedRoute>
                } 
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
  );
};

// Componente wrapper para monitorear sesión dentro del Router
const AppWithSessionMonitor = () => {
  useSessionMonitor();
  return <AppContent />;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppWithSessionMonitor />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
