-- Add removal_reason column to enrollments for tracking why students were removed
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS removal_reason text;

-- Create a new table for group class messages (all members can see)
CREATE TABLE IF NOT EXISTS public.class_group_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for class_group_messages
ALTER TABLE public.class_group_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Enrolled students and tutor can view group messages
CREATE POLICY "Users can view group messages in their classes"
ON public.class_group_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM classes WHERE classes.id = class_group_messages.class_id AND classes.tutor_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM enrollments 
    WHERE enrollments.class_id = class_group_messages.class_id 
    AND enrollments.student_id = auth.uid() 
    AND enrollments.status = 'approved'
  )
);

-- Policy: Enrolled students and tutor can send group messages
CREATE POLICY "Users can send group messages in their classes"
ON public.class_group_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND (
    EXISTS (
      SELECT 1 FROM classes WHERE classes.id = class_group_messages.class_id AND classes.tutor_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM enrollments 
      WHERE enrollments.class_id = class_group_messages.class_id 
      AND enrollments.student_id = auth.uid() 
      AND enrollments.status = 'approved'
    )
  )
);

-- Enable realtime for group messages (if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'class_group_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.class_group_messages;
  END IF;
END $$;