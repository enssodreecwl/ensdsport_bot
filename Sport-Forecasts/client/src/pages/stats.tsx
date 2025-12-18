import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsSkeleton } from "@/components/loading-skeleton";
import { TrendingUp, TrendingDown, Trophy, Target, Percent, Calendar } from "lucide-react";
import { SportIcon, getSportLabel } from "@/components/sport-icon";
import type { Prediction, SportType } from "@shared/schema";

interface StatsData {
  total: number;
  won: number;
  lost: number;
  pending: number;
  winRate: number;
  bySport: Record<SportType, { total: number; won: number; lost: number; winRate: number }>;
}

export default function Stats() {
  const { data: predictions, isLoading } = useQuery<Prediction[]>({
    queryKey: ["/api/predictions"],
  });

  if (isLoading) {
    return <StatsSkeleton />;
  }

  const stats: StatsData = {
    total: predictions?.length || 0,
    won: predictions?.filter((p) => p.status === "won").length || 0,
    lost: predictions?.filter((p) => p.status === "lost").length || 0,
    pending: predictions?.filter((p) => p.status === "pending").length || 0,
    winRate: 0,
    bySport: {} as Record<SportType, { total: number; won: number; lost: number; winRate: number }>,
  };

  const completedPredictions = stats.won + stats.lost;
  stats.winRate = completedPredictions > 0 ? Math.round((stats.won / completedPredictions) * 100) : 0;

  const sportTypes: SportType[] = ["football", "hockey", "mma", "ufc", "boxing", "other"];
  sportTypes.forEach((sport) => {
    const sportPredictions = predictions?.filter((p) => p.sport === sport) || [];
    const sportWon = sportPredictions.filter((p) => p.status === "won").length;
    const sportLost = sportPredictions.filter((p) => p.status === "lost").length;
    const sportCompleted = sportWon + sportLost;
    stats.bySport[sport] = {
      total: sportPredictions.length,
      won: sportWon,
      lost: sportLost,
      winRate: sportCompleted > 0 ? Math.round((sportWon / sportCompleted) * 100) : 0,
    };
  });

  const activeSports = sportTypes.filter((sport) => stats.bySport[sport].total > 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Статистика</h1>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-predictions">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Всего прогнозов</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Percent className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-win-rate">{stats.winRate}%</p>
                <p className="text-xs text-muted-foreground">Винрейт</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-won">{stats.won}</p>
                <p className="text-xs text-muted-foreground">Выигрышных</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-lost">{stats.lost}</p>
                <p className="text-xs text-muted-foreground">Проигрышных</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {activeSports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="w-5 h-5" />
              По видам спорта
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeSports.map((sport) => {
              const sportStats = stats.bySport[sport];
              return (
                <div 
                  key={sport} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  data-testid={`stats-sport-${sport}`}
                >
                  <div className="flex items-center gap-3">
                    <SportIcon sport={sport} className="w-5 h-5" />
                    <span className="font-medium">{getSportLabel(sport)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      {sportStats.total} прогн.
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 dark:text-green-400">{sportStats.won}W</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-red-600 dark:text-red-400">{sportStats.lost}L</span>
                    </div>
                    <span className="font-semibold w-12 text-right">
                      {sportStats.winRate}%
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {stats.pending > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Calendar className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Ожидают результата</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
