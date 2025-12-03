import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  emoji: string;
  colorScheme: "primary" | "success" | "warning" | "info";
  description: string;
  trend: string;
}

interface StatsCardsProps {
  stats: StatCardProps[];
}

const StatsCards = ({ stats }: StatsCardsProps) => {
  const getColorClasses = (scheme: string) => {
    switch (scheme) {
      case "primary":
        return {
          bg: "bg-primary/10",
          text: "text-primary",
          border: "border-primary/20",
        };
      case "success":
        return {
          bg: "bg-success/10",
          text: "text-success",
          border: "border-success/20",
        };
      case "warning":
        return {
          bg: "bg-warning/10",
          text: "text-warning",
          border: "border-warning/20",
        };
      case "info":
        return {
          bg: "bg-info/10",
          text: "text-info",
          border: "border-info/20",
        };
      default:
        return {
          bg: "bg-primary/10",
          text: "text-primary",
          border: "border-primary/20",
        };
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const colors = getColorClasses(stat.colorScheme);
        
        return (
          <Card 
            key={index} 
            className={`hover:shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer border-2 ${colors.border} relative overflow-hidden`}
          >
            <div className={`absolute top-0 right-0 w-32 h-32 ${colors.bg} rounded-full -mr-16 -mt-16 opacity-50`} />
            <CardContent className="p-5 sm:p-6 relative">
              <div className="flex items-start justify-between mb-4 sm:mb-5">
                <div className={`p-3 rounded-xl ${colors.bg} transition-colors`}>
                  <span className="text-3xl sm:text-4xl">{stat.emoji}</span>
                </div>
                <Icon className={`h-5 w-5 ${colors.text} opacity-50`} />
              </div>
              <div className="space-y-2">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <p className={`text-2xl sm:text-3xl font-bold ${colors.text}`}>{stat.value}</p>
                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </div>
                <p className={`text-xs sm:text-sm ${colors.text} font-medium`}>{stat.trend}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default StatsCards;