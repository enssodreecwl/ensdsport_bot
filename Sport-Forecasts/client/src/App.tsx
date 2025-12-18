import { useEffect, useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomNavigation } from "@/components/bottom-navigation";
import { initTelegramApp, getTelegramUser, getInitData, isDarkMode, getTelegramWebApp } from "@/lib/telegram";
import Home from "@/pages/home";
import Profile from "@/pages/profile";
import Stats from "@/pages/stats";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";
import type { User } from "@shared/schema";

// Demo user for testing outside Telegram
const DEMO_USER = {
  id: "demo",
  telegramId: "demo123",
  username: "demo_user",
  firstName: "Demo",
  lastName: "User",
  isVip: false,
  isAdmin: true,
  points: 150,
  streak: 3,
  level: 1,
  totalPredictionsViewed: 5,
  activeDays: 3,
  lastDailyBonus: null,
  vipExpiresAt: null,
  createdAt: new Date(),
};

function AppContent() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    initTelegramApp();
    
    const webApp = getTelegramWebApp();
    if (!webApp) {
      setDemoMode(true);
    }
    
    if (isDarkMode()) {
      document.documentElement.classList.add("dark");
    }
    
    setIsInitialized(true);
  }, []);

  const telegramUser = getTelegramUser();
  const initData = getInitData();

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/user"],
    enabled: isInitialized && !demoMode,
    retry: 1,
  });

  useEffect(() => {
    if (isInitialized && telegramUser && !user && !isLoading && !demoMode) {
      fetch("/api/user/init", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Init-Data": initData,
        },
        body: JSON.stringify({
          telegramId: telegramUser.id.toString(),
          username: telegramUser.username,
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name,
        }),
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      });
    }
  }, [isInitialized, telegramUser, user, isLoading, initData, demoMode]);

  // Use demo user when not in Telegram
  const currentUser = demoMode ? DEMO_USER as User : user;

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {demoMode && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-sm text-amber-600 dark:text-amber-400">
          Демо-режим (откройте в Telegram для полного функционала)
        </div>
      )}
      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        <Switch>
          <Route path="/">
            <Home user={currentUser || null} />
          </Route>
          <Route path="/profile">
            <Profile user={currentUser || null} />
          </Route>
          <Route path="/stats">
            <Stats />
          </Route>
          <Route path="/admin">
            <Admin user={currentUser || null} />
          </Route>
          <Route component={NotFound} />
        </Switch>
      </main>
      <BottomNavigation isAdmin={currentUser?.isAdmin} />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
