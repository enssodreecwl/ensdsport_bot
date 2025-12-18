import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SportIcon, getSportLabel, sportLabels } from "@/components/sport-icon";
import { PredictionListSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { hapticFeedback } from "@/lib/telegram";
import { Plus, Pencil, Trash2, Settings, FileText, Users, Shield } from "lucide-react";
import type { Prediction, User, SPORT_TYPES, PREDICTION_STATUS } from "@shared/schema";
import { format } from "date-fns";

const predictionFormSchema = z.object({
  sport: z.enum(["football", "hockey", "mma", "ufc", "boxing", "other"]),
  team1: z.string().min(1, "Обязательное поле"),
  team2: z.string().min(1, "Обязательное поле"),
  prediction: z.string().min(1, "Обязательное поле"),
  analysis: z.string().optional(),
  odds: z.string().optional(),
  confidence: z.string().optional(),
  isVip: z.boolean().default(false),
  matchTime: z.string().min(1, "Укажите время матча"),
});

type PredictionFormData = z.infer<typeof predictionFormSchema>;

interface AdminProps {
  user: User | null;
}

export default function Admin({ user }: AdminProps) {
  const { toast } = useToast();
  const [editingPrediction, setEditingPrediction] = useState<Prediction | null>(null);

  const { data: predictions, isLoading: predictionsLoading } = useQuery<Prediction[]>({
    queryKey: ["/api/admin/predictions"],
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const form = useForm<PredictionFormData>({
    resolver: zodResolver(predictionFormSchema),
    defaultValues: {
      sport: "football",
      team1: "",
      team2: "",
      prediction: "",
      analysis: "",
      odds: "",
      confidence: "",
      isVip: false,
      matchTime: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: PredictionFormData) => {
      const payload = {
        ...data,
        odds: data.odds ? parseFloat(data.odds) : null,
        confidence: data.confidence ? parseInt(data.confidence) : null,
        matchTime: new Date(data.matchTime).toISOString(),
      };
      return apiRequest("POST", "/api/admin/predictions", payload);
    },
    onSuccess: () => {
      hapticFeedback("success");
      toast({ title: "Прогноз создан" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/predictions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/predictions"] });
      form.reset();
    },
    onError: () => {
      hapticFeedback("error");
      toast({ title: "Ошибка создания", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PredictionFormData> }) => {
      const payload = {
        ...data,
        odds: data.odds ? parseFloat(data.odds) : null,
        confidence: data.confidence ? parseInt(data.confidence) : null,
        matchTime: data.matchTime ? new Date(data.matchTime).toISOString() : undefined,
      };
      return apiRequest("PATCH", `/api/admin/predictions/${id}`, payload);
    },
    onSuccess: () => {
      hapticFeedback("success");
      toast({ title: "Прогноз обновлён" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/predictions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/predictions"] });
      setEditingPrediction(null);
      form.reset();
    },
    onError: () => {
      hapticFeedback("error");
      toast({ title: "Ошибка обновления", variant: "destructive" });
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
    onError: () => {
      hapticFeedback("error");
      toast({ title: "Ошибка удаления", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, result }: { id: string; status: string; result?: string }) => {
      return apiRequest("PATCH", `/api/admin/predictions/${id}/status`, { status, result });
    },
    onSuccess: () => {
      hapticFeedback("success");
      toast({ title: "Статус обновлён" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/predictions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/predictions"] });
    },
    onError: () => {
      hapticFeedback("error");
      toast({ title: "Ошибка обновления статуса", variant: "destructive" });
    },
  });

  const onSubmit = (data: PredictionFormData) => {
    if (editingPrediction) {
      updateMutation.mutate({ id: editingPrediction.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (prediction: Prediction) => {
    setEditingPrediction(prediction);
    form.reset({
      sport: prediction.sport,
      team1: prediction.team1,
      team2: prediction.team2,
      prediction: prediction.prediction,
      analysis: prediction.analysis || "",
      odds: prediction.odds?.toString() || "",
      confidence: prediction.confidence?.toString() || "",
      isVip: prediction.isVip,
      matchTime: format(new Date(prediction.matchTime), "yyyy-MM-dd'T'HH:mm"),
    });
  };

  const handleCancelEdit = () => {
    setEditingPrediction(null);
    form.reset();
  };

  if (!user?.isAdmin) {
    return (
      <EmptyState
        icon={Shield}
        title="Доступ запрещён"
        description="Эта страница доступна только администраторам"
      />
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Админ-панель</h1>

      <Tabs defaultValue="predictions">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="predictions" data-testid="tab-predictions">
            <FileText className="w-4 h-4 mr-2" />
            Прогнозы
          </TabsTrigger>
          <TabsTrigger value="add" data-testid="tab-add">
            <Plus className="w-4 h-4 mr-2" />
            {editingPrediction ? "Редакт." : "Добавить"}
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="w-4 h-4 mr-2" />
            Юзеры
          </TabsTrigger>
        </TabsList>

        <TabsContent value="predictions" className="mt-4">
          {predictionsLoading ? (
            <PredictionListSkeleton count={3} />
          ) : predictions && predictions.length > 0 ? (
            <div className="space-y-3">
              {predictions.map((prediction) => (
                <Card key={prediction.id} data-testid={`admin-prediction-${prediction.id}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <SportIcon sport={prediction.sport} className="w-4 h-4" />
                          <span className="font-medium">{prediction.team1} vs {prediction.team2}</span>
                          {prediction.isVip && (
                            <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-xs">VIP</Badge>
                          )}
                          <Badge variant={
                            prediction.status === "won" ? "default" :
                            prediction.status === "lost" ? "destructive" :
                            "secondary"
                          } className="text-xs">
                            {prediction.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{prediction.prediction}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(prediction.matchTime), "dd.MM.yyyy HH:mm")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(prediction)}
                          data-testid={`button-edit-${prediction.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(prediction.id)}
                          data-testid={`button-delete-${prediction.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {prediction.status === "pending" && (
                      <div className="flex gap-2 mt-3 pt-3 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-green-600"
                          onClick={() => updateStatusMutation.mutate({ 
                            id: prediction.id, 
                            status: "won" 
                          })}
                          data-testid={`button-mark-won-${prediction.id}`}
                        >
                          Выигрыш
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-red-600"
                          onClick={() => updateStatusMutation.mutate({ 
                            id: prediction.id, 
                            status: "lost" 
                          })}
                          data-testid={`button-mark-lost-${prediction.id}`}
                        >
                          Проигрыш
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="Нет прогнозов"
              description="Создайте первый прогноз"
            />
          )}
        </TabsContent>

        <TabsContent value="add" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {editingPrediction ? "Редактировать прогноз" : "Новый прогноз"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="sport"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Вид спорта</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-sport">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(sportLabels).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center gap-2">
                                  <SportIcon sport={key as any} className="w-4 h-4" />
                                  {label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="team1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Команда 1</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Название" data-testid="input-team1" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="team2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Команда 2</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Название" data-testid="input-team2" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="matchTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Время матча</FormLabel>
                        <FormControl>
                          <Input {...field} type="datetime-local" data-testid="input-match-time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="prediction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Прогноз</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Ваш прогноз на матч..." 
                            data-testid="input-prediction"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="analysis"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Анализ (опционально)</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Детальный анализ..." 
                            data-testid="input-analysis"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="odds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Коэффициент</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              step="0.01" 
                              placeholder="1.85" 
                              data-testid="input-odds"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confidence"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Уверенность (%)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              min="1" 
                              max="100" 
                              placeholder="75" 
                              data-testid="input-confidence"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="isVip"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">VIP прогноз</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Доступен только VIP подписчикам
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-vip"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    {editingPrediction && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelEdit}
                        className="flex-1"
                      >
                        Отмена
                      </Button>
                    )}
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="flex-1"
                      data-testid="button-submit-prediction"
                    >
                      {createMutation.isPending || updateMutation.isPending
                        ? "Сохранение..."
                        : editingPrediction
                          ? "Сохранить"
                          : "Создать прогноз"
                      }
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          {usersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="pt-4">
                    <div className="animate-pulse flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-1/3" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : users && users.length > 0 ? (
            <div className="space-y-3">
              {users.map((u) => (
                <Card key={u.id} data-testid={`admin-user-${u.id}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="font-semibold text-primary">
                            {u.firstName?.[0] || u.username?.[0] || "U"}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{u.firstName || u.username || "User"}</span>
                            {u.isVip && (
                              <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-xs">VIP</Badge>
                            )}
                            {u.isAdmin && (
                              <Badge variant="secondary" className="text-xs">Admin</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            @{u.username || u.telegramId} · {u.points} баллов
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Серия: {u.streak}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="Нет пользователей"
              description="Пользователи появятся после первого входа"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
