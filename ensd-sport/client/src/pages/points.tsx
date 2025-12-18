import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/context/UserContext";
import { ArrowLeft, Star, Eye, Calendar, Users, Zap, Gift, Lock, Bot, TrendingUp } from "lucide-react";
import type { PointsHistory } from "@shared/schema";

const actionIcons = {
  daily_login: Calendar,
  view_prediction: Eye,
  subscribe_channel: Users,
  invite_friend: Users,
  streak_bonus: Zap,
  admin_bonus: Gift,
  spend_vip: Lock,
  spend_ai: Bot,
};

const actionLabels = {
  daily_login: "Ежедневный вход",
  view_prediction: "Просмотр прогноза",
  subscribe_channel: "Подписка на канал",
  invite_friend: "Приглашение друга",
  streak_bonus: "Бонус за серию",
  admin_bonus: "Бонус от админа",
  spend_vip: "VIP доступ",
  spend_ai: "ИИ-анализ",
};

const earnMethods = [
  { action: "daily_login", points: "+5", description: "Заходи каждый день" },
  { action: "view_prediction", points: "+2", description: "Смотри прогнозы" },
  { action: "subscribe_channel", points: "+20", description: "Подпишись на канал" },
  { action: "invite_friend", points: "+30", description: "Пригласи друга" },
  { action: "streak_bonus", points: "+10", description: "7 дней подряд" },
];

const spendMethods = [
  { title: "VIP канал", points: "500", description: "Доступ на 7 дней", icon: Lock, available: false },
  { title: "ИИ-анализ", points: "100", description: "Анализ матча", icon: Bot, available: false },
  { title: "Ранний доступ", points: "50", description: "Прогноз заранее", icon: TrendingUp, available: false },
];

function HistoryItem({ item }: { item: PointsHistory }) {
  const Icon = actionIcons[item.action] || Star;
  const label = actionLabels[item.action] || item.action;
  const isPositive = item.amount > 0;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPositive ? "bg-green-500/20" : "bg-red-500/20"}`}>
        <Icon className={`w-5 h-5 ${isPositive ? "text-green-400" : "text-red-400"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{label}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
        )}
      </div>
      <Badge variant={isPositive ? "secondary" : "destructive"} className="font-mono tabular-nums">
        {isPositive ? "+" : ""}{item.amount}
      </Badge>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="flex items-center gap-3 py-3">
      <Skeleton className="w-10 h-10 rounded-xl" />
      <div className="flex-1">
        <Skeleton className="h-4 w-32 mb-1" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-5 w-12" />
    </div>
  );
}

export default function PointsPage() {
  const { user, isLoading: userLoading } = useUser();

  const { data: history, isLoading: historyLoading } = useQuery<PointsHistory[]>({
    queryKey: ["/api/points/history"],
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button size="icon" variant="ghost" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <Star className="w-5 h-5 text-yellow-400" />
          <h1 className="text-lg font-bold text-foreground">Баллы</h1>
        </div>
      </header>

      <main className="p-4 pb-24 space-y-6">
        <Card className="p-6 bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border-card-border text-center">
          {userLoading ? (
            <Skeleton className="h-12 w-32 mx-auto" />
          ) : (
            <div className="text-5xl font-bold text-foreground tabular-nums" data-testid="text-points-balance">
              {user?.points || 0}
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-2">Ваш баланс баллов</p>
          {user?.loginStreak && user.loginStreak > 1 && (
            <Badge variant="secondary" className="mt-3 gap-1">
              <Zap className="w-3 h-3 text-orange-400" />
              Серия: {user.loginStreak} дней
            </Badge>
          )}
        </Card>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">Как заработать</h2>
          <Card className="p-4 border-card-border divide-y divide-border">
            {earnMethods.map((method) => {
              const Icon = actionIcons[method.action as keyof typeof actionIcons];
              return (
                <div key={method.action} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{actionLabels[method.action as keyof typeof actionLabels]}</p>
                    <p className="text-xs text-muted-foreground">{method.description}</p>
                  </div>
                  <Badge variant="secondary" className="font-mono tabular-nums text-green-400">
                    {method.points}
                  </Badge>
                </div>
              );
            })}
          </Card>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">На что потратить</h2>
          <div className="grid gap-3">
            {spendMethods.map((method) => (
              <Card
                key={method.title}
                className={`p-4 border-card-border ${!method.available ? "opacity-60" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <method.icon className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{method.title}</p>
                      {!method.available && (
                        <Badge variant="secondary" className="text-[10px] px-1.5">Скоро</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{method.description}</p>
                  </div>
                  <Badge variant="outline" className="font-mono tabular-nums">
                    {method.points}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">История</h2>
          <Card className="p-4 border-card-border">
            {historyLoading ? (
              <div className="space-y-0">
                {[1, 2, 3].map((i) => (
                  <HistorySkeleton key={i} />
                ))}
              </div>
            ) : !history || history.length === 0 ? (
              <div className="py-8 text-center">
                <Star className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">История пуста</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Смотри прогнозы, чтобы зарабатывать баллы
                </p>
              </div>
            ) : (
              <div>
                {history.slice(0, 10).map((item) => (
                  <HistoryItem key={item.id} item={item} />
                ))}
              </div>
            )}
          </Card>
        </section>
      </main>
    </div>
  );
}
