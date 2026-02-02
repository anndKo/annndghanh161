-- Create attendance table
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  checked_in BOOLEAN NOT NULL DEFAULT false,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Create unique constraint to prevent duplicate attendance per day
CREATE UNIQUE INDEX idx_attendance_unique ON public.attendance(student_id, class_id, attendance_date);

-- RLS Policies
CREATE POLICY "Students can create their own attendance"
ON public.attendance
FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can view their own attendance"
ON public.attendance
FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Tutors can view attendance for their classes"
ON public.attendance
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.classes 
  WHERE classes.id = attendance.class_id 
  AND classes.tutor_id = auth.uid()
));

CREATE POLICY "Admins can manage all attendance"
ON public.attendance
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for attendance
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;