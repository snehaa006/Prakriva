import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface DoshaMeterProps {
  dosha: 'vata' | 'pitta' | 'kapha';
  value: number;
  label?: string;
  className?: string;
}

export const DoshaMeter = ({ dosha, value, label, className }: DoshaMeterProps) => {
  const getDoshaInfo = (dosha: string) => {
    switch (dosha) {
      case 'vata':
        return {
          color: 'text-vata',
          bgColor: 'bg-vata',
          name: 'Vata (Air & Space)',
          description: 'Movement, breathing, circulation'
        };
      case 'pitta':
        return {
          color: 'text-pitta',
          bgColor: 'bg-pitta',
          name: 'Pitta (Fire & Water)',
          description: 'Digestion, metabolism, transformation'
        };
      case 'kapha':
        return {
          color: 'text-kapha',
          bgColor: 'bg-kapha',
          name: 'Kapha (Earth & Water)',
          description: 'Structure, immunity, lubrication'
        };
      default:
        return {
          color: 'text-muted-foreground',
          bgColor: 'bg-muted',
          name: dosha,
          description: ''
        };
    }
  };

  const doshaInfo = getDoshaInfo(dosha);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className={cn("text-sm font-medium", doshaInfo.color)}>
            {label || doshaInfo.name}
          </h4>
          <p className="text-xs text-muted-foreground">{doshaInfo.description}</p>
        </div>
        <span className="text-sm font-semibold">{value}%</span>
      </div>
      <Progress 
        value={value} 
        className="h-3"
        // Custom styling would be applied through CSS variables
      />
    </div>
  );
};