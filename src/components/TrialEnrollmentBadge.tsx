import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle } from 'lucide-react';

interface TrialEnrollmentBadgeProps {
  trialExpiresAt: string | null;
  enrollmentType: string | null;
}

const TrialEnrollmentBadge = ({ trialExpiresAt, enrollmentType }: TrialEnrollmentBadgeProps) => {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (enrollmentType !== 'trial' || !trialExpiresAt) {
      setDaysRemaining(null);
      return;
    }

    const calculateDays = () => {
      const now = new Date();
      const expiresAt = new Date(trialExpiresAt);
      const diffTime = expiresAt.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 0) {
        setIsExpired(true);
        setDaysRemaining(0);
      } else {
        setIsExpired(false);
        setDaysRemaining(diffDays);
      }
    };

    calculateDays();
    // Update every minute
    const interval = setInterval(calculateDays, 60000);
    return () => clearInterval(interval);
  }, [trialExpiresAt, enrollmentType]);

  if (enrollmentType !== 'trial' || daysRemaining === null) {
    return null;
  }

  if (isExpired) {
    return (
      <Badge variant="destructive" className="animate-pulse">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Hết hạn học thử
      </Badge>
    );
  }

  return (
    <Badge 
      variant={daysRemaining <= 2 ? 'destructive' : 'outline'} 
      className={daysRemaining <= 2 ? 'animate-pulse' : ''}
    >
      <Clock className="w-3 h-3 mr-1" />
      Học thử – còn {daysRemaining} ngày
    </Badge>
  );
};

export default TrialEnrollmentBadge;
