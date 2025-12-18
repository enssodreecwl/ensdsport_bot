import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getTelegramUser, initTelegramApp, isTelegramWebApp } from "@/lib/telegram";
import { apiRequest, queryClient, setTelegramId as setGlobalTelegramId } from "@/lib/queryClient";
import type { User } from "@shared/schema";

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  telegramId: string | null;
  refreshUser: () => void;
}

const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
  isAdmin: false,
  telegramId: null,
  refreshUser: () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [authCompleted, setAuthCompleted] = useState(false);

  useEffect(() => {
    initTelegramApp();
    const tgUser = getTelegramUser();
    if (tgUser) {
      const id = tgUser.id.toString();
      setTelegramId(id);
      setGlobalTelegramId(id);
    } else if (!isTelegramWebApp()) {
      setTelegramId("demo_user_123");
      setGlobalTelegramId("demo_user_123");
    }
  }, []);

  const authMutation = useMutation({
    mutationFn: async () => {
      const tgUser = getTelegramUser();
      const payload = tgUser ? {
        telegramId: tgUser.id.toString(),
        username: tgUser.username || null,
        firstName: tgUser.first_name,
        lastName: tgUser.last_name || null,
        photoUrl: tgUser.photo_url || null,
      } : {
        telegramId: "demo_user_123",
        username: "demo_user",
        firstName: "Demo",
        lastName: "User",
        photoUrl: null,
      };
      const response = await apiRequest("POST", "/api/auth/telegram", payload);
      return response.json();
    },
    onSuccess: (data) => {
      setAuthCompleted(true);
      queryClient.setQueryData(["/api/users/me", telegramId], data);
    },
    onError: () => {
      setAuthCompleted(true);
    },
  });

  useEffect(() => {
    if (telegramId && !authCompleted && !authMutation.isPending) {
      authMutation.mutate();
    }
  }, [telegramId, authCompleted, authMutation.isPending]);

  const { data: user, isLoading, refetch } = useQuery<User>({
    queryKey: ["/api/users/me", telegramId],
    enabled: !!telegramId && authCompleted,
  });

  const refreshUser = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <UserContext.Provider
      value={{
        user: user || null,
        isLoading: !authCompleted || isLoading || authMutation.isPending,
        isAdmin: user?.isAdmin || false,
        telegramId,
        refreshUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
