import { useQuery, useMutation } from "@tanstack/react-query";
import { UserProfileHeader } from "@/components/user-profile-header";
import { DailyBonusCard } from "@/components/daily-bonus-card";
import { VipUpgradeCard } from "@/components/vip-upgrade-card";
import { ProfileSkeleton } from "@/components/loading-skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getTelegramWebApp, hapticFeedback } from "@/lib/telegram";
import type { User, UserStats, DailyBonusResult } from "@shared/schema";

interface ProfileProps {
  user: User | null;
}

// Demo stats for testing outside Telegram
const DEMO_STATS: UserStats = {
  points: 150,
  streak: 3,
  level: 1,
  totalPredictionsViewed: 5,
  activeDays: 3,
  isVip: false,
  vipExpiresAt: null,
  canClaimDailyBonus: true,
};

export default function Profile({ user }: ProfileProps) {
  const { toast } = useToast();
  const webApp = getTelegramWebApp();
  const isDemoMode = !webApp;

  const { data: stats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ["/api/user/stats"],
    enabled: !!user && !isDemoMode,
  });

  const claimBonusMutation = useMutation({
    mutationFn: async (): Promise<DailyBonusResult> => {
      if (isDemoMode) {
        // Demo mode response
        return { points: 30, newStreak: 4, bonusMultiplier: 3 };
      }
      const response = await apiRequest("POST", "/api/user/claim-bonus");
      return response.json();
    },
    onSuccess: () => {
      if (!isDemoMode) {
        queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      }
    },
    onError: () => {
      hapticFeedback("error");
      toast({
        title: "Ошибка",
        description: "Не удалось получить бонус",
        variant: "destructive",
      });
    },
  });

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (isDemoMode) {
        toast({
          title: "Демо-режим",
          description: "Оплата доступна только в Telegram",
        });
        return { invoiceUrl: null };
      }
      const response = await apiRequest("POST", "/api/vip/create-invoice");
      return response.json();
    },
    onSuccess: (data) => {
      if (webApp && data.invoiceUrl) {
        webApp.openInvoice(data.invoiceUrl, (status) => {
          if (status === "paid") {
            hapticFeedback("success");
            toast({
              title: "Успешно!",
              description: "VIP подписка активирована",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/user"] });
            queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
          }
        });
      }
    },
    onError: () => {
      hapticFeedback("error");
      toast({
        title: "Ошибка",
        description: "Не удалось создать счёт для оплаты",
        variant: "destructive",
      });
    },
  });

  const handleClaimBonus = async (): Promise<DailyBonusResult> => {
    return claimBonusMutation.mutateAsync();
  };

  const handleUpgrade = () => {
    subscribeMutation.mutate();
  };

  // Use demo stats in demo mode
  const currentStats = isDemoMode ? DEMO_STATS : stats;

  if (statsLoading && !isDemoMode) {
    return (
      <div className="space-y-6">
        <ProfileSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <UserProfileHeader user={user} stats={currentStats || null} />

      <DailyBonusCard
        canClaim={currentStats?.canClaimDailyBonus || false}
        currentStreak={currentStats?.streak || 0}
        onClaim={handleClaimBonus}
      />

      {!currentStats?.isVip && (
        <VipUpgradeCard
          onUpgrade={handleUpgrade}
          isLoading={subscribeMutation.isPending}
        />
      )}
    </div>
  );
}
