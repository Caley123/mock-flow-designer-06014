import { Badge } from '@/components/ui/badge';
import { ReincidenceLevel } from '@/types';
import { getReincidenceLevelColor, getReincidenceLevelLabel } from '@/lib/utils/reincidenceUtils';

interface ReincidenceBadgeProps {
  level: ReincidenceLevel;
  className?: string;
}

export const ReincidenceBadge = ({ level, className }: ReincidenceBadgeProps) => {
  const color = getReincidenceLevelColor(level);
  const label = getReincidenceLevelLabel(level);

  const variantMap = {
    success: 'default',
    warning: 'secondary',
    danger: 'destructive',
  };

  return (
    <Badge 
      variant={variantMap[color] as any}
      className={className}
      style={{
        backgroundColor: color === 'success' ? 'hsl(var(--success))' : 
                        color === 'warning' ? 'hsl(var(--warning))' : 
                        'hsl(var(--danger))',
        color: 'hsl(var(--success-foreground))',
      }}
    >
      {label}
    </Badge>
  );
};
