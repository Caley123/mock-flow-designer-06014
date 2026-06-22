import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoadingScreen } from "./components/ui/loading-screen";
import { SuccessFlashOverlay } from "./components/feedback/SuccessFlashOverlay";
import { authService } from "./lib/services";
import { useSessionMonitor } from "./hooks/useSessionMonitor";
import { PageMetaManager } from "./components/seo/PageMetaManager";
import { SiteAnalytics } from "./components/seo/SiteAnalytics";
import { StaffLayoutShell } from "./components/layout/StaffLayoutShell";
import { lazyPage } from "./lib/lazyPage";

const Login = lazyPage(() => import("./pages/Login").then(m => ({ default: m.Login })));
const Dashboard = lazyPage(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
const RegisterIncident = lazyPage(() => import("./pages/RegisterIncident").then(m => ({ default: m.RegisterIncident })));
const IncidentsList = lazyPage(() => import("./pages/IncidentsList").then(m => ({ default: m.IncidentsList })));
const StudentsList = lazyPage(() => import("./pages/StudentsList").then(m => ({ default: m.StudentsList })));
const FaultsCatalog = lazyPage(() => import("./pages/FaultsCatalog").then(m => ({ default: m.FaultsCatalog })));
const Reports = lazyPage(() => import("./pages/Reports").then(m => ({ default: m.Reports })));
const AttendanceReport = lazyPage(() => import("./pages/AttendanceReport").then(m => ({ default: m.AttendanceReport })));
const TutorScanner = lazyPage(() => import("./pages/TutorScanner").then(m => ({ default: m.TutorScanner })));
const AuditLogs = lazyPage(() => import("./pages/AuditLogs").then(m => ({ default: m.AuditLogs })));
const SystemConfig = lazyPage(() => import("./pages/SystemConfig").then(m => ({ default: m.SystemConfig })));
const ArrivalControl = lazyPage(() => import("./pages/ArrivalControl").then(m => ({ default: m.ArrivalControl })));
const ParentMeetings = lazyPage(() => import("./pages/ParentMeetings").then(m => ({ default: m.ParentMeetings })));
const ParentPortalRoute = lazyPage(() =>
  import("./components/parent/ParentPortalRoute").then((m) => ({ default: m.ParentPortalRoute }))
);
const JustifyFaults = lazyPage(() => import("./pages/JustifyFaults").then(m => ({ default: m.JustifyFaults })));
const ArrivalView = lazyPage(() => import("./pages/ArrivalView").then(m => ({ default: m.ArrivalView })));
const ParentDniPortal = lazyPage(() => import("./pages/ParentDniPortal").then(m => ({ default: m.ParentDniPortal })));
const ChangePassword = lazyPage(() => import("./pages/ChangePassword").then(m => ({ default: m.ChangePassword })));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 5 * 60 * 1000,   // 5 min: datos frescos mientras navegas
      gcTime: 20 * 60 * 1000,     // 20 min en caché sin usar
    },
  },
});

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const user = authService.getCurrentUser();
  if (user) {
    return <Navigate to="/" replace />;
  }
  return children as React.ReactElement;
};

const RootRoute = () => {
  const user = authService.getCurrentUser();

  if (!user) return <Navigate to="/login" replace />;

  if (user.cambioPasswordObligatorio) {
    return <Navigate to="/cambiar-password" replace />;
  }

  if (user.role === 'Tutor') return <Navigate to="/tutor-scanner" replace />;
  if (user.role === 'Padre') return <Navigate to="/parent-portal" replace />;
  return <Navigate to="/dashboard" replace />;
};

/** Pantalla completa para rutas sin Layout (login, tutor, etc.). */
const FullScreenLoading = () => <LoadingScreen message="Cargando SIE…" />;

const LazyFullScreen = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<FullScreenLoading />}>{children}</Suspense>
);

const AppContent = () => {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <LazyFullScreen>
            <PublicRoute>
              <Login />
            </PublicRoute>
          </LazyFullScreen>
        }
      />
      <Route path="/" element={<RootRoute />} />

      {/* Staff — supervisor, director, admin */}
      <Route
        element={
          <ProtectedRoute requiredRole={['Supervisor', 'Director', 'Admin']}>
            <StaffLayoutShell requiredRole={['Supervisor', 'Director', 'Admin']} />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/register" element={<RegisterIncident />} />
        <Route path="/incidents" element={<IncidentsList />} />
        <Route path="/students" element={<StudentsList />} />
        <Route path="/attendance-report" element={<AttendanceReport />} />
        <Route path="/arrival-control" element={<ArrivalControl />} />
        <Route path="/parent-meetings" element={<ParentMeetings />} />
        <Route path="/justify-faults" element={<JustifyFaults />} />
      </Route>

      {/* Staff — director y admin */}
      <Route
        element={
          <ProtectedRoute requiredRole={['Director', 'Admin']}>
            <StaffLayoutShell requiredRole={['Director', 'Admin']} />
          </ProtectedRoute>
        }
      >
        <Route path="/faults" element={<FaultsCatalog />} />
        <Route path="/reports" element={<Reports />} />
      </Route>

      {/* Staff — solo admin */}
      <Route
        element={
          <ProtectedRoute requiredRole={['Admin']}>
            <StaffLayoutShell requiredRole={['Admin']} />
          </ProtectedRoute>
        }
      >
        <Route path="/audit" element={<AuditLogs />} />
        <Route path="/system-config" element={<SystemConfig />} />
      </Route>

      <Route
        path="/tutor-scanner"
        element={
          <ProtectedRoute requiredRole={['Tutor']}>
            <LazyFullScreen>
              <TutorScanner />
            </LazyFullScreen>
          </ProtectedRoute>
        }
      />
      <Route
        path="/parent-portal"
        element={
          <ProtectedRoute requiredRole={['Padre', 'Supervisor', 'Director', 'Admin']}>
            <LazyFullScreen>
              <ParentPortalRoute />
            </LazyFullScreen>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cambiar-password"
        element={
          <LazyFullScreen>
            <ChangePassword />
          </LazyFullScreen>
        }
      />
      <Route
        path="/portal-padres"
        element={
          <LazyFullScreen>
            <ParentDniPortal />
          </LazyFullScreen>
        }
      />
      <Route
        path="/llegada/dni/:dni"
        element={
          <LazyFullScreen>
            <ArrivalView />
          </LazyFullScreen>
        }
      />
      <Route
        path="/llegada/:id"
        element={
          <LazyFullScreen>
            <ArrivalView />
          </LazyFullScreen>
        }
      />
      <Route
        path="*"
        element={
          <LazyFullScreen>
            <NotFound />
          </LazyFullScreen>
        }
      />
    </Routes>
  );
};

const AppWithSessionMonitor = () => {
  useSessionMonitor();
  return (
    <>
      <PageMetaManager />
      <SiteAnalytics />
      <AppContent />
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SuccessFlashOverlay />
        <BrowserRouter>
          <AppWithSessionMonitor />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
