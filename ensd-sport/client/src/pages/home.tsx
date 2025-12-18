import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/context/UserContext";
import { Dribbble, Trophy, Star, Bot, Lock, Settings } from "lucide-react";

const menuItems = [
  {
    id: "football",
    title: "Футбол",
    icon: Dribbble,
    href: "/football",
    color: "from-green-500/20 to-green-600/10",
    iconColor: "text-green-400",
    available: true,
  },
  {
    id: "hockey",
    title: "Хоккей",
    icon: Trophy,
    href: "/hockey",
    color: "from-blue-500/20 to-blue-600/10",
    iconColor: "text-blue-400",
    available: true,
  },
  {
    id: "points",
    title: "Баллы",
    icon: Star,
    href: "/points",
    color: "from-yellow-500/20 to-yellow-600/10",
    iconColor: "text-yellow-400",
    available: true,
  },
  {
    id: "ai",
    title: "ИИ-анализ",
    icon: Bot,
    href: "/ai",
    color: "from-purple-500/20 to-purple-600/10",
    iconColor: "text-purple-400",
    available: false,
    badge: "Скоро",
  },
  {
    id: "vip",
    title: "VIP",
    icon: Lock,
    href: "/vip",
    color: "from-orange-500/20 to-orange-600/10",
    iconColor: "text-orange-400",
    available: false,
    badge: "Скоро",
  },
  {
    id: "settings",
    title: "Настройки",
    icon: Settings,
    href: "/settings",
    color: "from-gray-500/20 to-gray-600/10",
    iconColor: "text-gray-400",
    available: true,
  },
];

export default function HomePage() {
  const { user, isAdmin } = useUser();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">E</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">ENSD SPORT</h1>
              <p className="text-xs text-muted-foreground">Прогнозы на спорт</p>
            </div>
          </div>
          <Link href="/points">
            <Badge
              variant="secondary"
              className="gap-1.5 px-3 py-1.5 cursor-pointer"
              data-testid="badge-points-header"
            >
              <Star className="w-3.5 h-3.5 text-yellow-400" />
              <span className="font-semibold tabular-nums">{user?.points || 0}</span>
            </Badge>
          </Link>
        </div>
      </header>

      <main className="p-4 pb-24">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-1">
            Привет{user?.firstName ? `, ${user.firstName}` : ""}!
          </h2>
          <p className="text-sm text-muted-foreground">
            Выбери раздел для просмотра прогнозов
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {menuItems.map((item) => (
            <Link key={item.id} href={item.available ? item.href : "#"}>
              <Card
                className={`relative overflow-visible aspect-square flex flex-col items-center justify-center p-4 bg-gradient-to-br ${item.color} border-card-border cursor-pointer transition-transform active:scale-[0.98] ${!item.available ? "opacity-60" : ""}`}
                data-testid={`card-menu-${item.id}`}
              >
                {item.badge && (
                  <Badge
                    variant="secondary"
                    className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5"
                  >
                    {item.badge}
                  </Badge>
                )}
                <div
                  className={`w-12 h-12 rounded-2xl bg-background/50 flex items-center justify-center mb-3 ${item.iconColor}`}
                >
                  <item.icon className="w-6 h-6" />
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {item.title}
                </span>
              </Card>
            </Link>
          ))}
        </div>

        {isAdmin && (
          <Link href="/admin">
            <Card
              className="mt-4 p-4 bg-gradient-to-br from-red-500/20 to-red-600/10 border-card-border cursor-pointer transition-transform active:scale-[0.98]"
              data-testid="card-admin-panel"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-background/50 flex items-center justify-center text-red-400">
                  <Settings className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Админ-панель</h3>
                  <p className="text-xs text-muted-foreground">Управление прогнозами</p>
                </div>
              </div>
            </Card>
          </Link>
        )}
      </main>
    </div>
  );
}
