import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { I18nProvider } from "@/contexts/I18nContext";
import Layout from "@/components/Layout";
import LoginPage from "@/pages/LoginPage";
import HomePage from "@/pages/HomePage";
import RankingPage from "@/pages/RankingPage";
import TeamsPage, { TeamDetailPage } from "@/pages/TeamsPage";
import MatchCWPage from "@/pages/MatchCWPage";
import MatchCWBetPage from "@/pages/MatchCWBetPage";
import TrainingPage from "@/pages/TrainingPage";
import RoulettePage from "@/pages/RoulettePage";
import ChatPage from "@/pages/ChatPage";
import NewsPage from "@/pages/NewsPage";
import ShopPage from "@/pages/ShopPage";
import ProfilePage from "@/pages/ProfilePage";
import FriendsPage from "@/pages/FriendsPage";
import AdminPage from "@/pages/AdminPage";
import TutorialPage from "@/pages/TutorialPage";
import NotificationsPage from "@/pages/NotificationsPage";
import SettingsPage from "@/pages/SettingsPage";
import SupportPage from "@/pages/SupportPage";
import AboutPage from "@/pages/AboutPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { isLoggedIn, isAdminUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary font-heading text-lg">Carregando...</div>
      </div>
    );
  }

  if (!isLoggedIn) return <LoginPage />;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/teams/:id" element={<TeamDetailPage />} />
        <Route path="/matchcw" element={<MatchCWPage />} />
        <Route path="/matchcw-bet" element={<MatchCWBetPage />} />
        <Route path="/matches" element={<MatchCWPage />} />
        <Route path="/training" element={<TrainingPage />} />
        <Route path="/roulette" element={<RoulettePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/tutorial" element={<TutorialPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/about" element={<AboutPage />} />
        {isAdminUser && <Route path="/admin" element={<AdminPage />} />}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <I18nProvider>
        <TooltipProvider>
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </I18nProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
