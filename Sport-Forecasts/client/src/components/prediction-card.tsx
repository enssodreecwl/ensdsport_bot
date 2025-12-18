import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SportIcon, getSportLabel } from "./sport-icon";
import { Lock, ChevronDown, ChevronUp, Clock, TrendingUp, Star, Check, X } from "lucide-react";
import type { Prediction } from "@shared/schema";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface PredictionCardProps {
  prediction: Prediction;
  isVipUser: boolean;
  onUpgradeClick?: () => void;
}

export function PredictionCard({ prediction, isVipUser, onUpgradeClick }: PredictionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const canView = !prediction.isVip || isVipUser;

  const statusColors = {
    pending: "bg-muted text-muted-foreground",
    won: "bg-green-500/10 text-green-600 dark:text-green-400",
    lost: "bg-red-500/10 text-red-600 dark:text-red-400",
    cancelled: "bg-muted text-muted-foreground",
  };

  const statusLabels = {
    pending: "Ожидает",
    won: "Выигран",
    lost: "Проигран",
    cancelled: "Отменён",
  };

  const statusIcons = {
    pending: Clock,
    won: Check,
    lost: X,
    cancelled: X,
  };

  const StatusIcon = statusIcons[prediction.status];

  return (
    <Card 
      className="overflow-visible transition-all duration-200"
      data-testid={`card-prediction-${prediction.id}`}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <SportIcon sport={prediction.sport} className="w-5 h-5" />
          <Badge variant="secondary" className="text-xs">
            {getSportLabel(prediction.sport)}
          </Badge>
          <Badge className={statusColors[prediction.status]}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusLabels[prediction.status]}
          </Badge>
        </div>
        {prediction.isVip && (
          <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-0">
            <Star className="w-3 h-3 mr-1 fill-current" />
            VIP
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-3 text-lg font-semibold">
            <span data-testid="text-team1">{prediction.team1}</span>
            <span className="text-muted-foreground text-sm">vs</span>
            <span data-testid="text-team2">{prediction.team2}</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>
              {format(new Date(prediction.matchTime), "d MMM, HH:mm", { locale: ru })}
            </span>
          </div>
        </div>

        {canView ? (
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-start gap-2">
                <TrendingUp className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium" data-testid="text-prediction">
                    {prediction.prediction}
                  </p>
                  {prediction.odds && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Коэффициент: <span className="font-semibold text-foreground">{prediction.odds.toFixed(2)}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {prediction.analysis && (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="w-full justify-between"
                  data-testid="button-expand-analysis"
                >
                  <span>Анализ</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
                {isExpanded && (
                  <div className="mt-2 p-3 rounded-lg bg-muted/30 text-sm text-muted-foreground">
                    {prediction.analysis}
                  </div>
                )}
              </div>
            )}

            {prediction.confidence && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Уверенность:</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${prediction.confidence}%` }}
                  />
                </div>
                <span className="text-xs font-medium">{prediction.confidence}%</span>
              </div>
            )}
          </div>
        ) : (
          <div className="relative">
            <div className="p-4 rounded-lg bg-muted/50 blur-sm select-none">
              <p className="font-medium">Прогноз доступен только VIP подписчикам</p>
              <p className="text-sm text-muted-foreground mt-1">Оформите подписку для доступа</p>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 rounded-lg">
              <Lock className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium mb-3">VIP контент</p>
              <Button 
                size="sm" 
                onClick={onUpgradeClick}
                className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-0"
                data-testid="button-upgrade-vip"
              >
                <Star className="w-4 h-4 mr-1" />
                Получить VIP
              </Button>
            </div>
          </div>
        )}

        {prediction.result && (
          <div className="p-3 rounded-lg bg-muted/30 border">
            <p className="text-sm">
              <span className="text-muted-foreground">Результат:</span>{" "}
              <span className="font-medium">{prediction.result}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
