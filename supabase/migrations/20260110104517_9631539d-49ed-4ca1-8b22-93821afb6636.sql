-- Add address field to classes
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS address TEXT;

-- Add trial_days field to classes for trial period configuration
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 7;

-- Create function to check and expire trial enrollments
CREATE OR REPLACE FUNCTION public.check_trial_expiration()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the enrollment is a trial and has expired
  IF NEW.enrollment_type = 'trial' AND NEW.trial_expires_at IS NOT NULL THEN
    IF NEW.trial_expires_at < NOW() AND NEW.status = 'approved' THEN
      NEW.status := 'removed';
      NEW.removal_reason := 'Hết hạn học thử';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to check trial expiration on enrollment updates
DROP TRIGGER IF EXISTS check_trial_expiration_trigger ON public.enrollments;
CREATE TRIGGER check_trial_expiration_trigger
BEFORE UPDATE ON public.enrollments
FOR EACH ROW
EXECUTE FUNCTION public.check_trial_expiration();