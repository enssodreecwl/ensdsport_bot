import { Link, useLocation } from "wouter";
import { Home, User, BarChart3, Settings } from "lucide-react";
import { hapticFeedback } from "@/lib/telegram";

interface NavItem {
  path: string;
  icon: typeof Home;
  label: string;
  testId: string;
}

const navItems: NavItem[] = [
  { path: "/", icon: Home, label: "Главная", testId: "nav-home" },
  { path: "/profile", icon: User, label: "Профиль", testId: "nav-profile" },
  { path: "/stats", icon: BarChart3, label: "Статистика", testId: "nav-stats" },
];

interface BottomNavigationProps {
  isAdmin?: boolean;
}

export function BottomNavigation({ isAdmin }: BottomNavigationProps) {
  const [location] = useLocation();

  const items = isAdmin
    ? [...navItems, { path: "/admin", icon: Settings, label: "Админ", testId: "nav-admin" }]
    : navItems;

  const handleClick = () => {
    hapticFeedback("selection");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t z-50 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {items.map((item) => {
          const isActive = location === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={handleClick}
              className={`
                flex flex-col items-center justify-center gap-1 flex-1 h-full
                transition-colors duration-200
                ${isActive 
                  ? "text-primary" 
                  : "text-muted-foreground"
                }
              `}
              data-testid={item.testId}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "stroke-[2.5px]" : ""}`} />
              <span className={`text-xs ${isActive ? "font-medium" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
