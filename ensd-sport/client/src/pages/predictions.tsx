import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { hapticFeedback } from "@/lib/telegram";
import { ArrowLeft, Dribbble, Trophy, TrendingUp, Flame, MessageSquare, Eye } from "lucide-react";
import type { Prediction } from "@shared/schema";

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all"
          style={{ width: `${value * 10}%` }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums text-muted-foreground">
        {value}/10
      </span>
    </div>
  );
}

function PredictionCard({ prediction, onView }: { prediction: Prediction; onView: (id: string) => void }) {
  const isFootball = prediction.sportType === "football";
  const Icon = isFootball ? Dribbble : Trophy;
  const iconColor = isFootball ? "text-green-400" : "text-blue-400";
  const bgColor = isFootball ? "from-green-500/10" : "from-blue-500/10";

  const resultColors = {
    pending: "bg-muted text-muted-foreground",
    won: "bg-green-500/20 text-green-400",
    lost: "bg-red-500/20 text-red-400",
    cancelled: "bg-gray-500/20 text-gray-400",
  };

  const resultLabels = {
    pending: "Ожидание",
    won: "Зашёл",
    lost: "Не зашёл",
    cancelled: "Отменён",
  };

  return (
    <Card
      className={`p-4 bg-gradient-to-br ${bgColor} to-transparent border-card-border cursor-pointer transition-transform active:scale-[0.99]`}
      onClick={() => onView(prediction.id)}
      data-testid={`card-prediction-${prediction.id}`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <span className="text-xs text-muted-foreground font-medium">
            {prediction.league}
          </span>
        </div>
        <Badge variant="secondary" className={resultColors[prediction.result]}>
          {resultLabels[prediction.result]}
        </Badge>
      </div>

      <h3 className="font-semibold text-foreground mb-3">
        {prediction.homeTeam} — {prediction.awayTeam}
      </h3>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Прогноз:</span>
          <span className="text-sm font-semibold text-foreground">{prediction.prediction}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Коэфф:</span>
          <Badge variant="outline" className="font-mono tabular-nums">
            {prediction.coefficient.toFixed(2)}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" />
          <span className="text-sm text-muted-foreground">Уверенность:</span>
          <div className="flex-1">
            <ConfidenceBar value={prediction.confidence} />
          </div>
        </div>

        {prediction.comment && (
          <div className="flex items-start gap-2 pt-2 border-t border-border">
            <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
            <p className="text-sm text-muted-foreground line-clamp-2">
              {prediction.comment}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 mt-3 pt-2 border-t border-border">
        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">+2 балла за просмотр</span>
      </div>
    </Card>
  );
}

function PredictionSkeleton() {
  return (
    <Card className="p-4 border-card-border">
      <div className="flex items-center justify-between gap-2 mb-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-5 w-3/4 mb-3" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </Card>
  );
}

export default function PredictionsPage() {
  const [, params] = useRoute("/:sport");
  const sport = params?.sport as "football" | "hockey";
  const { user, refreshUser } = useUser();
  const { toast } = useToast();

  const isFootball = sport === "football";
  const Icon = isFootball ? Dribbble : Trophy;
  const title = isFootball ? "Футбол" : "Хоккей";
  const iconColor = isFootball ? "text-green-400" : "text-blue-400";

  const { data: predictions, isLoading } = useQuery<Prediction[]>({
    queryKey: ["/api/predictions", sport],
  });

  const viewMutation = useMutation({
    mutationFn: async (predictionId: string) => {
      return apiRequest("POST", `/api/predictions/${predictionId}/view`);
    },
    onSuccess: () => {
      hapticFeedback("success");
      toast({
        title: "+2 балла",
        description: "За просмотр прогноза",
      });
      refreshUser();
      queryClient.invalidateQueries({ queryKey: ["/api/predictions"] });
    },
  });

  const handleView = (predictionId: string) => {
    if (user) {
      viewMutation.mutate(predictionId);
    }
  };

  const activePredictions = predictions?.filter((p) => !p.isArchived && !p.isHidden) || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button size="icon" variant="ghost" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <Icon className={`w-5 h-5 ${iconColor}`} />
          <h1 className="text-lg font-bold text-foreground">{title}</h1>
          <Badge variant="secondary" className="ml-auto">
            {activePredictions.length} прогнозов
          </Badge>
        </div>
      </header>

      <main className="p-4 pb-24">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <PredictionSkeleton key={i} />
            ))}
          </div>
        ) : activePredictions.length === 0 ? (
          <Card className="p-8 text-center border-card-border">
            <Icon className={`w-12 h-12 mx-auto mb-4 ${iconColor} opacity-50`} />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Пока нет прогнозов
            </h3>
            <p className="text-sm text-muted-foreground">
              Новые прогнозы появятся здесь
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {activePredictions.map((prediction) => (
              <PredictionCard
                key={prediction.id}
                prediction={prediction}
                onView={handleView}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
