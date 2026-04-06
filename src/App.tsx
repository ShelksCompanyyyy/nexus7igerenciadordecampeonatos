import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import LoginPage from "@/pages/LoginPage";
import HomePage from "@/pages/HomePage";
import RankingPage from "@/pages/RankingPage";
import TeamsPage, { TeamDetailPage } from "@/pages/TeamsPage";
import MatchesPage from "@/pages/MatchesPage";
import TrainingPage from "@/pages/TrainingPage";
import RoulettePage from "@/pages/RoulettePage";
import ChatPage from "@/pages/ChatPage";
import NewsPage from "@/pages/NewsPage";
import ShopPage from "@/pages/ShopPage";
import ProfilePage from "@/pages/ProfilePage";
import AdminPage from "@/pages/AdminPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { isLoggedIn, isAdminUser } = useAuth();
  if (!isLoggedIn) return <LoginPage />;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/teams/:id" element={<TeamDetailPage />} />
        <Route path="/matches" element={<MatchesPage />} />
        <Route path="/training" element={<TrainingPage />} />
        <Route path="/roulette" element={<RoulettePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        {isAdminUser && <Route path="/admin" element={<AdminPage />} />}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
