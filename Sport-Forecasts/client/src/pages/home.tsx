import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PredictionCard } from "@/components/prediction-card";
import { SportFilter } from "@/components/sport-filter";
import { PredictionListSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { Trophy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Prediction, SportType, User } from "@shared/schema";
import { useLocation } from "wouter";

interface HomeProps {
  user: User | null;
}

export default function Home({ user }: HomeProps) {
  const [selectedSport, setSelectedSport] = useState<SportType | "all">("all");
  const [, navigate] = useLocation();

  const { data: predictions, isLoading, refetch, isRefetching } = useQuery<Prediction[]>({
    queryKey: ["/api/predictions", selectedSport],
  });

  const filteredPredictions = predictions?.filter(
    (p) => selectedSport === "all" || p.sport === selectedSport
  );

  const handleUpgradeClick = () => {
    navigate("/profile");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Прогнозы</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => refetch()}
          disabled={isRefetching}
          data-testid="button-refresh"
        >
          <RefreshCw className={`w-5 h-5 ${isRefetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <SportFilter selected={selectedSport} onSelect={setSelectedSport} />

      {isLoading ? (
        <PredictionListSkeleton count={3} />
      ) : filteredPredictions && filteredPredictions.length > 0 ? (
        <div className="space-y-4">
          {filteredPredictions.map((prediction) => (
            <PredictionCard
              key={prediction.id}
              prediction={prediction}
              isVipUser={user?.isVip || false}
              onUpgradeClick={handleUpgradeClick}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Trophy}
          title="Нет прогнозов"
          description={
            selectedSport === "all"
              ? "Пока нет доступных прогнозов. Загляните позже!"
              : "Нет прогнозов для выбранного вида спорта"
          }
          action={
            selectedSport !== "all"
              ? { label: "Показать все", onClick: () => setSelectedSport("all") }
              : undefined
          }
        />
      )}
    </div>
  );
}
