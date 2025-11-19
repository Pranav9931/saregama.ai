import { Badge } from '@/components/ui/badge';
import { Clock, AlertCircle } from 'lucide-react';

interface RentalBadgeProps {
  daysRemaining: number;
  isExpired?: boolean;
}

export default function RentalBadge({ daysRemaining, isExpired = false }: RentalBadgeProps) {
  if (isExpired) {
    return (
      <Badge variant="destructive" className="gap-1" data-testid="badge-rental-expired">
        <AlertCircle className="w-3 h-3" />
        Expired
      </Badge>
    );
  }

  const isUrgent = daysRemaining < 2;
  const variant = isUrgent ? 'destructive' : 'secondary';

  return (
    <Badge variant={variant} className="gap-1" data-testid={`badge-rental-${daysRemaining}d`}>
      <Clock className="w-3 h-3" />
      {daysRemaining}d left
    </Badge>
  );
}
