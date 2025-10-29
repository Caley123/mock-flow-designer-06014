import { Badge } from '@/components/ui/badge';
import { FaultSeverity } from '@/types';

interface SeverityBadgeProps {
  severity: FaultSeverity;
  className?: string;
}

export const SeverityBadge = ({ severity, className }: SeverityBadgeProps) => {
  return (
    <Badge 
      variant={severity === 'Grave' ? 'destructive' : 'secondary'}
      className={className}
    >
      {severity}
    </Badge>
  );
};
