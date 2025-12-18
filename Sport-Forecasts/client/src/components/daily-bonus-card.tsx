import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Flame, Coins, Check, Sparkles } from "lucide-react";
import { hapticFeedback } from "@/lib/telegram";
import type { DailyBonusResult } from "@shared/schema";

interface DailyBonusCardProps {
  canClaim: boolean;
  currentStreak: number;
  onClaim: () => Promise<DailyBonusResult>;
}

export function DailyBonusCard({ canClaim, currentStreak, onClaim }: DailyBonusCardProps) {
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<DailyBonusResult | null>(null);

  const streakDays = Array.from({ length: 7 }, (_, i) => i + 1);

  const handleClaim = async () => {
    if (!canClaim || isClaiming) return;
    
    setIsClaiming(true);
    hapticFeedback("medium");
    
    try {
      const result = await onClaim();
      setClaimResult(result);
      hapticFeedback("success");
    } catch {
      hapticFeedback("error");
    } finally {
      setIsClaiming(false);
    }
  };

  const baseBonus = 10;
  const streakMultiplier = Math.min(currentStreak + 1, 7);
  const potentialBonus = baseBonus * streakMultiplier;

  return (
    <Card className="overflow-visible">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gift className="w-5 h-5 text-primary" />
          Ежедневный бонус
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between gap-1">
          {streakDays.map((day) => {
            const isCompleted = day <= currentStreak;
            const isCurrent = day === currentStreak + 1;
            return (
              <div
                key={day}
                className={`
                  flex-1 aspect-square rounded-lg flex flex-col items-center justify-center text-xs
                  transition-all duration-200
                  ${isCompleted 
                    ? "bg-primary text-primary-foreground" 
                    : isCurrent && canClaim
                      ? "bg-primary/20 border-2 border-primary border-dashed"
                      : "bg-muted"
                  }
                `}
                data-testid={`streak-day-${day}`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <>
                    <Flame className={`w-3 h-3 ${isCurrent && canClaim ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={isCurrent && canClaim ? "text-primary font-medium" : "text-muted-foreground"}>
                      {day}
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {claimResult ? (
          <div className="text-center space-y-2 py-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10">
              <Sparkles className="w-8 h-8 text-green-500" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-green-500">+{claimResult.points}</p>
              <p className="text-sm text-muted-foreground">
                Серия: {claimResult.newStreak} {claimResult.newStreak === 1 ? "день" : claimResult.newStreak < 5 ? "дня" : "дней"}
                {claimResult.bonusMultiplier > 1 && (
                  <span className="text-primary"> (x{claimResult.bonusMultiplier})</span>
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-3xl font-bold">
                <Coins className="w-8 h-8 text-amber-500" />
                <span>+{potentialBonus}</span>
              </div>
              {streakMultiplier > 1 && (
                <p className="text-sm text-muted-foreground mt-1">
                  Бонус за серию: x{streakMultiplier}
                </p>
              )}
            </div>

            <Button
              onClick={handleClaim}
              disabled={!canClaim || isClaiming}
              className="w-full"
              size="lg"
              data-testid="button-claim-bonus"
            >
              {isClaiming ? (
                "Получение..."
              ) : canClaim ? (
                <>
                  <Gift className="w-4 h-4 mr-2" />
                  Получить бонус
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Бонус получен
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
