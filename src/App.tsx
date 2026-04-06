import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import Footer from "./components/Footer";
import TermsOfServiceDialog from "./components/TermsOfServiceDialog";
import SystemAnnouncementBanner from "./components/SystemAnnouncementBanner";
import LanguagePickerDialog from "./components/LanguagePickerDialog";
import { Loader2 } from 'lucide-react';

// Lazy load all page components
const Index = lazy(() => import('./pages/Index'));
const Auth = lazy(() => import('./pages/Auth'));
const TutorRegister = lazy(() => import('./pages/TutorRegister'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const TutorDashboard = lazy(() => import('./pages/TutorDashboard'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const ClassPage = lazy(() => import('./pages/ClassPage'));
const TutorManagement = lazy(() => import('./pages/TutorManagement'));
const AdminGuides = lazy(() => import('./pages/AdminGuides'));
const GuidesPage = lazy(() => import('./pages/GuidesPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AccountDeleted = lazy(() => import('./pages/AccountDeleted'));
const TutorProfilePage = lazy(() => import('./pages/TutorProfilePage'));
const NotFound = lazy(() => import('./pages/NotFound'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes  
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const Layout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col min-h-screen">
    <SystemAnnouncementBanner />
    <div className="flex-1">
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </div>
    <Footer />
    <TermsOfServiceDialog />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <LanguagePickerDialog />
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/tutor/register" element={<TutorRegister />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/tutors" element={<TutorManagement />} />
                <Route path="/admin/guides" element={<AdminGuides />} />
                <Route path="/tutor" element={<TutorDashboard />} />
                <Route path="/student" element={<StudentDashboard />} />
                <Route path="/class/:classId" element={<ClassPage />} />
                <Route path="/guides" element={<GuidesPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/account-deleted" element={<AccountDeleted />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
