
-- System announcements table
CREATE TABLE public.system_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  image_url text,
  target_role text NOT NULL DEFAULT 'all',
  priority integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage announcements" ON public.system_announcements
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view active announcements" ON public.system_announcements
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Dismissed announcements table
CREATE TABLE public.dismissed_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  announcement_id uuid NOT NULL REFERENCES public.system_announcements(id) ON DELETE CASCADE,
  dismissed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, announcement_id)
);

ALTER TABLE public.dismissed_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own dismissals" ON public.dismissed_announcements
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create storage bucket for announcement images
INSERT INTO storage.buckets (id, name, public) VALUES ('announcement-images', 'announcement-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can upload announcement images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'announcement-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view announcement images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'announcement-images');

CREATE POLICY "Admins can delete announcement images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'announcement-images' AND has_role(auth.uid(), 'admin'::app_role));
