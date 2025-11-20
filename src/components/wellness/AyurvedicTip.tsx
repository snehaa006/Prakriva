import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Leaf, Sun, Moon, Droplets } from "lucide-react";

interface AyurvedicTipProps {
  title: string;
  description: string;
  category: 'nutrition' | 'lifestyle' | 'seasonal' | 'dosha';
  dosha?: 'vata' | 'pitta' | 'kapha';
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
}

export const AyurvedicTip = ({ 
  title, 
  description, 
  category, 
  dosha, 
  timeOfDay 
}: AyurvedicTipProps) => {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'nutrition': return Leaf;
      case 'lifestyle': return Sun;
      case 'seasonal': return Droplets;
      case 'dosha': return Moon;
      default: return Leaf;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'nutrition': return 'bg-success text-white';
      case 'lifestyle': return 'bg-warning text-white';
      case 'seasonal': return 'bg-info text-white';
      case 'dosha': return 'bg-primary text-white';
      default: return 'bg-muted text-foreground';
    }
  };

  const getDoshaColor = (dosha?: string) => {
    if (!dosha) return '';
    switch (dosha) {
      case 'vata': return 'border-l-vata';
      case 'pitta': return 'border-l-pitta';
      case 'kapha': return 'border-l-kapha';
      default: return '';
    }
  };

  const Icon = getCategoryIcon(category);

  return (
    <Card className={`border-l-4 ${getDoshaColor(dosha)} transition-smooth hover:shadow-lg`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            {title}
          </CardTitle>
          <div className="flex gap-2">
            <Badge className={getCategoryColor(category)}>
              {category}
            </Badge>
            {dosha && (
              <Badge variant="outline" className={`text-${dosha}`}>
                {dosha}
              </Badge>
            )}
            {timeOfDay && (
              <Badge variant="secondary">
                {timeOfDay}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
};