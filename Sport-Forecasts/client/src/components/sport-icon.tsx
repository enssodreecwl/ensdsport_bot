import { Dribbble, CircleDot, Swords, Trophy, Dumbbell, HelpCircle } from "lucide-react";
import type { SportType } from "@shared/schema";

interface SportIconProps {
  sport: SportType;
  className?: string;
}

const sportIcons: Record<SportType, typeof Dribbble> = {
  football: Dribbble,
  hockey: CircleDot,
  mma: Swords,
  ufc: Swords,
  boxing: Dumbbell,
  other: HelpCircle,
};

const sportColors: Record<SportType, string> = {
  football: "text-green-500",
  hockey: "text-blue-500",
  mma: "text-red-500",
  ufc: "text-orange-500",
  boxing: "text-purple-500",
  other: "text-muted-foreground",
};

const sportLabels: Record<SportType, string> = {
  football: "Футбол",
  hockey: "Хоккей",
  mma: "MMA",
  ufc: "UFC",
  boxing: "Бокс",
  other: "Другое",
};

export function SportIcon({ sport, className }: SportIconProps) {
  const Icon = sportIcons[sport] || sportIcons.other;
  const colorClass = sportColors[sport] || sportColors.other;

  return <Icon className={`${colorClass} ${className || ""}`} />;
}

export function getSportLabel(sport: SportType): string {
  return sportLabels[sport] || "Другое";
}

export function getSportColor(sport: SportType): string {
  return sportColors[sport] || sportColors.other;
}

export { sportLabels, sportColors };
