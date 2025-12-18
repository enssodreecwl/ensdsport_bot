import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@/context/UserContext";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, User, Star, Calendar, Bell, HelpCircle, Shield, ExternalLink } from "lucide-react";

export default function SettingsPage() {
  const { user, isLoading, isAdmin } = useUser();

  const getInitials = () => {
    if (!user) return "U";
    const first = user.firstName?.[0] || "";
    const last = user.lastName?.[0] || "";
    return (first + last).toUpperCase() || "U";
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button size="icon" variant="ghost" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold text-foreground">Настройки</h1>
        </div>
      </header>

      <main className="p-4 pb-24 space-y-6">
        <Card className="p-6 border-card-border">
          {isLoading ? (
            <div className="flex items-center gap-4">
              <Skeleton className="w-16 h-16 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={user?.photoUrl || undefined} />
                <AvatarFallback className="text-lg bg-primary/20 text-primary">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground truncate" data-testid="text-user-name">
                    {user?.firstName} {user?.lastName}
                  </h2>
                  {isAdmin && (
                    <Badge variant="secondary" className="gap-1">
                      <Shield className="w-3 h-3" /> Админ
                    </Badge>
                  )}
                </div>
                {user?.username && (
                  <p className="text-sm text-muted-foreground truncate">
                    @{user.username}
                  </p>
                )}
              </div>
            </div>
          )}
        </Card>

        <section className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground px-1">Профиль</h3>
          <Card className="border-card-border divide-y divide-border">
            <div className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <Star className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Баллы</p>
                <p className="text-xs text-muted-foreground">Ваш баланс</p>
              </div>
              <Badge variant="secondary" className="font-mono tabular-nums" data-testid="text-points-settings">
                {user?.points || 0}
              </Badge>
            </div>

            <div className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Серия входов</p>
                <p className="text-xs text-muted-foreground">Дней подряд</p>
              </div>
              <Badge variant="secondary" className="font-mono tabular-nums">
                {user?.loginStreak || 0}
              </Badge>
            </div>

            <div className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Дата регистрации</p>
                <p className="text-xs text-muted-foreground">{formatDate(user?.createdAt || null)}</p>
              </div>
            </div>
          </Card>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground px-1">Поддержка</h3>
          <Card className="border-card-border divide-y divide-border">
            <a
              href="https://t.me/ensd_sport_support"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Помощь</p>
                <p className="text-xs text-muted-foreground">Написать в поддержку</p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>

            <a
              href="https://t.me/ensd_sport"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Telegram канал</p>
                <p className="text-xs text-muted-foreground">Подписаться на обновления</p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
          </Card>
        </section>

        <div className="text-center pt-4">
          <p className="text-xs text-muted-foreground">ENSD SPORT v1.0.0</p>
          <p className="text-xs text-muted-foreground mt-1">Made with love for sports</p>
        </div>
      </main>
    </div>
  );
}
