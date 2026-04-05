DROP POLICY IF EXISTS "Students can delete own non-approved enrollments" ON public.enrollments;

CREATE POLICY "Students can delete own non-approved enrollments"
ON public.enrollments
FOR DELETE
TO authenticated
USING (
  (student_id = auth.uid()) 
  AND (
    status = ANY (ARRAY['removed', 'expired', 'rejected', 'pending'])
    OR (
      status = 'approved' 
      AND (
        (enrollment_type = 'trial' AND trial_expires_at IS NOT NULL AND trial_expires_at < now())
        OR (enrollment_type = 'real' AND enrollment_expires_at IS NOT NULL AND enrollment_expires_at < now())
      )
    )
  )
);