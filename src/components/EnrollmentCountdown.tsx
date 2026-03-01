import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle } from 'lucide-react';

interface EnrollmentCountdownProps {
  enrollmentExpiresAt: string | null;
  enrollmentType: string | null;
  showLabel?: boolean;
}

const EnrollmentCountdown = ({ enrollmentExpiresAt, enrollmentType, showLabel = true }: EnrollmentCountdownProps) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [totalMs, setTotalMs] = useState(0);

  useEffect(() => {
    if (!enrollmentExpiresAt) {
      setTimeLeft(null);
      return;
    }

    const calculate = () => {
      const now = new Date().getTime();
      const expires = new Date(enrollmentExpiresAt).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setTotalMs(0);
        return;
      }

      setIsExpired(false);
      setTotalMs(diff);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculate();
    // Update every second for countdown
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [enrollmentExpiresAt]);

  // For trial type, use trial_expires_at instead (handled by TrialEnrollmentBadge)
  if (enrollmentType === 'trial') {
    return null;
  }

  if (!enrollmentExpiresAt) {
    return null;
  }

  if (isExpired) {
    return (
      <Badge variant="destructive" className="animate-pulse">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Hết hạn học
      </Badge>
    );
  }

  if (!timeLeft) return null;

  const is48h = totalMs <= 48 * 60 * 60 * 1000;

  if (is48h) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return (
      <Badge variant="destructive" className="animate-pulse font-mono">
        <Clock className="w-3 h-3 mr-1" />
        {showLabel && 'Còn '}
        {pad(timeLeft.hours + timeLeft.days * 24)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </Badge>
    );
  }

  return (
    <Badge 
      variant={timeLeft.days <= 7 ? 'destructive' : 'default'}
      className={timeLeft.days <= 7 ? 'animate-pulse' : 'bg-success'}
    >
      <Clock className="w-3 h-3 mr-1" />
      {showLabel && 'Còn '}{timeLeft.days} ngày
    </Badge>
  );
};

export default EnrollmentCountdown;
