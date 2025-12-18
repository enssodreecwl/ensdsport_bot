import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { hapticFeedback } from "@/lib/telegram";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  BarChart3,
  Users,
  Dribbble,
  Trophy,
  TrendingUp,
  Check,
  X,
} from "lucide-react";
import type { Prediction, User } from "@shared/schema";

interface PredictionFormData {
  sportType: "football" | "hockey";
  league: string;
  homeTeam: string;
  awayTeam: string;
  prediction: string;
  coefficient: string;
  confidence: string;
  comment: string;
  matchDate: string;
}

const defaultFormData: PredictionFormData = {
  sportType: "football",
  league: "",
  homeTeam: "",
  awayTeam: "",
  prediction: "",
  coefficient: "",
  confidence: "7",
  comment: "",
  matchDate: "",
};

function PredictionForm({
  onSubmit,
  isLoading,
  initialData,
}: {
  onSubmit: (data: PredictionFormData) => void;
  isLoading: boolean;
  initialData?: PredictionFormData;
}) {
  const [formData, setFormData] = useState<PredictionFormData>(initialData || defaultFormData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Вид спорта</Label>
        <Select
          value={formData.sportType}
          onValueChange={(v) => setFormData({ ...formData, sportType: v as "football" | "hockey" })}
        >
          <SelectTrigger data-testid="select-sport-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="football">Футбол</SelectItem>
            <SelectItem value="hockey">Хоккей</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Лига</Label>
        <Input
          placeholder="АПЛ, КХЛ, NHL..."
          value={formData.league}
          onChange={(e) => setFormData({ ...formData, league: e.target.value })}
          required
          data-testid="input-league"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Хозяева</Label>
          <Input
            placeholder="Команда 1"
            value={formData.homeTeam}
            onChange={(e) => setFormData({ ...formData, homeTeam: e.target.value })}
            required
            data-testid="input-home-team"
          />
        </div>
        <div className="space-y-2">
          <Label>Гости</Label>
          <Input
            placeholder="Команда 2"
            value={formData.awayTeam}
            onChange={(e) => setFormData({ ...formData, awayTeam: e.target.value })}
            required
            data-testid="input-away-team"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Прогноз</Label>
        <Input
          placeholder="П1, П2, Х, ТБ 2.5..."
          value={formData.prediction}
          onChange={(e) => setFormData({ ...formData, prediction: e.target.value })}
          required
          data-testid="input-prediction"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Коэффициент</Label>
          <Input
            type="number"
            step="0.01"
            min="1"
            placeholder="2.35"
            value={formData.coefficient}
            onChange={(e) => setFormData({ ...formData, coefficient: e.target.value })}
            required
            data-testid="input-coefficient"
          />
        </div>
        <div className="space-y-2">
          <Label>Уверенность (1-10)</Label>
          <Input
            type="number"
            min="1"
            max="10"
            placeholder="7"
            value={formData.confidence}
            onChange={(e) => setFormData({ ...formData, confidence: e.target.value })}
            required
            data-testid="input-confidence"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Дата матча</Label>
        <Input
          type="datetime-local"
          value={formData.matchDate}
          onChange={(e) => setFormData({ ...formData, matchDate: e.target.value })}
          data-testid="input-match-date"
        />
      </div>

      <div className="space-y-2">
        <Label>Комментарий</Label>
        <Textarea
          placeholder="Аналитика, обоснование прогноза..."
          value={formData.comment}
          onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
          className="min-h-24"
          data-testid="input-comment"
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-submit-prediction">
        {isLoading ? "Сохранение..." : initialData ? "Сохранить" : "Опубликовать"}
      </Button>
    </form>
  );
}

function AdminPredictionCard({
  prediction,
  onDelete,
  onUpdateResult,
}: {
  prediction: Prediction;
  onDelete: (id: string) => void;
  onUpdateResult: (id: string, result: "won" | "lost" | "cancelled") => void;
}) {
  const isFootball = prediction.sportType === "football";
  const Icon = isFootball ? Dribbble : Trophy;
  const iconColor = isFootball ? "text-green-400" : "text-blue-400";

  const resultColors = {
    pending: "bg-muted text-muted-foreground",
    won: "bg-green-500/20 text-green-400",
    lost: "bg-red-500/20 text-red-400",
    cancelled: "bg-gray-500/20 text-gray-400",
  };

  return (
    <Card className="p-4 border-card-border">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <span className="text-xs text-muted-foreground">{prediction.league}</span>
        </div>
        <Badge variant="secondary" className={resultColors[prediction.result]}>
          {prediction.result}
        </Badge>
      </div>

      <h3 className="font-semibold text-foreground mb-2">
        {prediction.homeTeam} — {prediction.awayTeam}
      </h3>

      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
        <span>{prediction.prediction}</span>
        <span>|</span>
        <span>{prediction.coefficient.toFixed(2)}</span>
        <span>|</span>
        <span>{prediction.confidence}/10</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {prediction.result === "pending" && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => onUpdateResult(prediction.id, "won")}
              data-testid={`button-result-won-${prediction.id}`}
            >
              <Check className="w-3 h-3 text-green-400" /> Зашёл
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => onUpdateResult(prediction.id, "lost")}
              data-testid={`button-result-lost-${prediction.id}`}
            >
              <X className="w-3 h-3 text-red-400" /> Не зашёл
            </Button>
          </>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="gap-1 text-destructive ml-auto"
          onClick={() => onDelete(prediction.id)}
          data-testid={`button-delete-${prediction.id}`}
        >
          <Trash2 className="w-3 h-3" /> Удалить
        </Button>
      </div>
    </Card>
  );
}

function StatsCard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: any; color: string }) {
  return (
    <Card className="p-4 border-card-border">
      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mb-2`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{title}</p>
    </Card>
  );
}

export default function AdminPage() {
  const { isAdmin } = useUser();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: predictions, isLoading: predictionsLoading } = useQuery<Prediction[]>({
    queryKey: ["/api/admin/predictions"],
    enabled: isAdmin,
  });

  const { data: stats } = useQuery<{
    totalPredictions: number;
    wonPredictions: number;
    lostPredictions: number;
    pendingPredictions: number;
    totalUsers: number;
  }>({
    queryKey: ["/api/admin/stats"],
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: async (data: PredictionFormData) => {
      return apiRequest("POST", "/api/admin/predictions", {
        ...data,
        coefficient: parseFloat(data.coefficient),
        confidence: parseInt(data.confidence),
        matchDate: data.matchDate ? new Date(data.matchDate).toISOString() : null,
      });
    },
    onSuccess: () => {
      hapticFeedback("success");
      toast({ title: "Прогноз опубликован" });
      setIsAddDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/predictions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/predictions"] });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось создать прогноз", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/predictions/${id}`);
    },
    onSuccess: () => {
      hapticFeedback("success");
      toast({ title: "Прогноз удалён" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/predictions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/predictions"] });
    },
  });

  const updateResultMutation = useMutation({
    mutationFn: async ({ id, result }: { id: string; result: "won" | "lost" | "cancelled" }) => {
      return apiRequest("PATCH", `/api/admin/predictions/${id}/result`, { result });
    },
    onSuccess: () => {
      hapticFeedback("success");
      toast({ title: "Результат обновлён" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/predictions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
  });

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center border-card-border max-w-sm">
          <h2 className="text-lg font-semibold text-foreground mb-2">Доступ запрещён</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Эта страница доступна только администраторам
          </p>
          <Link href="/">
            <Button data-testid="button-go-home">На главную</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const winRate = stats && stats.wonPredictions + stats.lostPredictions > 0
    ? Math.round((stats.wonPredictions / (stats.wonPredictions + stats.lostPredictions)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button size="icon" variant="ghost" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold text-foreground">Админ-панель</h1>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="ml-auto gap-1" data-testid="button-add-prediction">
                <Plus className="w-4 h-4" /> Добавить
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Новый прогноз</DialogTitle>
              </DialogHeader>
              <PredictionForm
                onSubmit={(data) => createMutation.mutate(data)}
                isLoading={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="p-4 pb-24">
        <Tabs defaultValue="predictions" className="space-y-4">
          <TabsList className="w-full">
            <TabsTrigger value="predictions" className="flex-1" data-testid="tab-predictions">
              Прогнозы
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex-1" data-testid="tab-stats">
              Статистика
            </TabsTrigger>
          </TabsList>

          <TabsContent value="predictions" className="space-y-4">
            {predictionsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-4 border-card-border">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </Card>
                ))}
              </div>
            ) : !predictions || predictions.length === 0 ? (
              <Card className="p-8 text-center border-card-border">
                <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">Пока нет прогнозов</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {predictions.map((prediction) => (
                  <AdminPredictionCard
                    key={prediction.id}
                    prediction={prediction}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onUpdateResult={(id, result) => updateResultMutation.mutate({ id, result })}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatsCard
                title="Всего прогнозов"
                value={stats?.totalPredictions || 0}
                icon={TrendingUp}
                color="bg-blue-500"
              />
              <StatsCard
                title="Пользователей"
                value={stats?.totalUsers || 0}
                icon={Users}
                color="bg-purple-500"
              />
              <StatsCard
                title="Зашло"
                value={stats?.wonPredictions || 0}
                icon={Check}
                color="bg-green-500"
              />
              <StatsCard
                title="Не зашло"
                value={stats?.lostPredictions || 0}
                icon={X}
                color="bg-red-500"
              />
            </div>

            <Card className="p-4 border-card-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Процент успешных</span>
                <span className="text-2xl font-bold text-foreground tabular-nums">{winRate}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all"
                  style={{ width: `${winRate}%` }}
                />
              </div>
            </Card>

            <Card className="p-4 border-card-border">
              <h3 className="font-semibold text-foreground mb-3">По видам спорта</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <Dribbble className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Футбол</p>
                  </div>
                  <Badge variant="secondary">
                    {predictions?.filter((p) => p.sportType === "football").length || 0}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Хоккей</p>
                  </div>
                  <Badge variant="secondary">
                    {predictions?.filter((p) => p.sportType === "hockey").length || 0}
                  </Badge>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
