import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Check, Lock, Zap, Crown, TrendingUp } from "lucide-react";
import { hapticFeedback } from "@/lib/telegram";

interface VipUpgradeCardProps {
  onUpgrade: () => void;
  isLoading?: boolean;
  price?: number;
}

const vipFeatures = [
  { icon: Lock, text: "Доступ к закрытым VIP-прогнозам" },
  { icon: TrendingUp, text: "Прогнозы с высокими коэффициентами" },
  { icon: Zap, text: "Ранний доступ к прогнозам" },
  { icon: Crown, text: "Эксклюзивная аналитика матчей" },
];

export function VipUpgradeCard({ onUpgrade, isLoading, price = 100 }: VipUpgradeCardProps) {
  const handleUpgrade = () => {
    hapticFeedback("medium");
    onUpgrade();
  };

  return (
    <Card className="overflow-visible border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-yellow-400/5">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 flex items-center justify-center mb-2">
          <Star className="w-8 h-8 text-white fill-white" />
        </div>
        <CardTitle className="text-2xl">VIP Подписка</CardTitle>
        <p className="text-muted-foreground text-sm">
          Получите полный доступ к эксклюзивному контенту
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          {vipFeatures.map((feature, index) => (
            <div 
              key={index} 
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
            >
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <feature.icon className="w-4 h-4 text-amber-500" />
              </div>
              <span className="text-sm">{feature.text}</span>
            </div>
          ))}
        </div>

        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            <span className="text-3xl font-bold">{price}</span>
            <span className="text-muted-foreground">звёзд/мес</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Оплата через Telegram Stars
          </p>
        </div>

        <Button
          onClick={handleUpgrade}
          disabled={isLoading}
          size="lg"
          className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-0"
          data-testid="button-subscribe-vip"
        >
          {isLoading ? (
            "Обработка..."
          ) : (
            <>
              <Star className="w-4 h-4 mr-2 fill-current" />
              Оформить VIP
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
