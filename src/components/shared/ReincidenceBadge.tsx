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
    success: 'success',
    warning: 'warning',
    danger: 'destructive',
  } as const;

  return (
    <Badge 
      variant={variantMap[color] as any}
      className={className}
    >
      {label}
    </Badge>
  );
};
