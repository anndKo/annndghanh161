import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, AlertTriangle } from 'lucide-react';

interface RealEnrollmentBadgeProps {
  enrollmentExpiresAt: string | null;
  enrollmentType: string | null;
}

const RealEnrollmentBadge = ({ enrollmentExpiresAt, enrollmentType }: RealEnrollmentBadgeProps) => {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (enrollmentType !== 'real' || !enrollmentExpiresAt) {
      setDaysRemaining(null);
      return;
    }

    const calculateDays = () => {
      const now = new Date();
      const expiresAt = new Date(enrollmentExpiresAt);
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
  }, [enrollmentExpiresAt, enrollmentType]);

  if (enrollmentType !== 'real') {
    return null;
  }

  // If no expiration date set, show permanent badge
  if (!enrollmentExpiresAt) {
    return (
      <Badge className="bg-success">
        <GraduationCap className="w-3 h-3 mr-1" />
        Học thật
      </Badge>
    );
  }

  if (isExpired) {
    return (
      <Badge variant="destructive" className="animate-pulse">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Hết hạn học thật
      </Badge>
    );
  }

  return (
    <Badge 
      variant={daysRemaining !== null && daysRemaining <= 7 ? 'destructive' : 'default'} 
      className={`bg-success ${daysRemaining !== null && daysRemaining <= 7 ? 'animate-pulse bg-destructive' : ''}`}
    >
      <GraduationCap className="w-3 h-3 mr-1" />
      Học thật – còn {daysRemaining} ngày
    </Badge>
  );
};

export default RealEnrollmentBadge;
