
-- Allow students to delete their own non-approved enrollments (for re-enrollment)
CREATE POLICY "Students can delete own non-approved enrollments"
ON public.enrollments
FOR DELETE
TO authenticated
USING (
  student_id = auth.uid() 
  AND status IN ('removed', 'expired', 'rejected', 'pending')
);
