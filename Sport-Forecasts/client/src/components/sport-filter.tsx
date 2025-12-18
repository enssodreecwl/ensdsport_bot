import { Button } from "@/components/ui/button";
import { SportIcon, sportLabels } from "./sport-icon";
import { SPORT_TYPES, type SportType } from "@shared/schema";
import { hapticFeedback } from "@/lib/telegram";

interface SportFilterProps {
  selected: SportType | "all";
  onSelect: (sport: SportType | "all") => void;
}

export function SportFilter({ selected, onSelect }: SportFilterProps) {
  const handleSelect = (sport: SportType | "all") => {
    hapticFeedback("selection");
    onSelect(sport);
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <Button
        variant={selected === "all" ? "default" : "secondary"}
        size="sm"
        onClick={() => handleSelect("all")}
        className="shrink-0"
        data-testid="button-filter-all"
      >
        Все
      </Button>
      {SPORT_TYPES.map((sport) => (
        <Button
          key={sport}
          variant={selected === sport ? "default" : "secondary"}
          size="sm"
          onClick={() => handleSelect(sport)}
          className="shrink-0 gap-1.5"
          data-testid={`button-filter-${sport}`}
        >
          <SportIcon sport={sport} className="w-4 h-4" />
          {sportLabels[sport]}
        </Button>
      ))}
    </div>
  );
}
