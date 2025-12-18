import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Star, Flame, Coins, Calendar, Eye, TrendingUp } from "lucide-react";
import type { User, UserStats } from "@shared/schema";

interface UserProfileHeaderProps {
  user: User | null;
  stats: UserStats | null;
}

export function UserProfileHeader({ user, stats }: UserProfileHeaderProps) {
  if (!user || !stats) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-muted" />
          <div className="space-y-2">
            <div className="w-32 h-5 bg-muted rounded" />
            <div className="w-20 h-4 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  const levelProgress = (stats.points % 1000) / 10;
  const pointsToNextLevel = 1000 - (stats.points % 1000);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Avatar className="w-16 h-16 border-2 border-primary/20">
          <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary">
            {user.firstName?.[0] || user.username?.[0] || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold" data-testid="text-username">
              {user.firstName || user.username || "Пользователь"}
            </h2>
            {stats.isVip ? (
              <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-0">
                <Star className="w-3 h-3 mr-1 fill-current" />
                VIP
              </Badge>
            ) : (
              <Badge variant="secondary">Free</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Уровень {stats.level}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Coins className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-2xl font-bold" data-testid="text-points">{stats.points.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Баллы</p>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
            <Flame className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-2xl font-bold" data-testid="text-streak">{stats.streak}</p>
            <p className="text-xs text-muted-foreground">Дней подряд</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">До уровня {stats.level + 1}</span>
          <span className="font-medium">{pointsToNextLevel} баллов</span>
        </div>
        <Progress value={levelProgress} className="h-2" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Eye className="w-4 h-4" />
          <span>Просмотрено: <span className="font-medium text-foreground">{stats.totalPredictionsViewed}</span></span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>Активных дней: <span className="font-medium text-foreground">{stats.activeDays}</span></span>
        </div>
      </div>

      {stats.isVip && stats.vipExpiresAt && (
        <div className="p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-yellow-400/10 border border-amber-500/20">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            <span className="text-sm">
              VIP до: <span className="font-medium">{new Date(stats.vipExpiresAt).toLocaleDateString("ru-RU")}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
