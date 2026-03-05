
-- Create guides table
CREATE TABLE public.guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_role TEXT NOT NULL DEFAULT 'student',
  title TEXT NOT NULL,
  content TEXT,
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;

-- Anyone can view guides
CREATE POLICY "Anyone can view guides" ON public.guides FOR SELECT USING (true);

-- Only admin can insert
CREATE POLICY "Admin can insert guides" ON public.guides FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admin can update
CREATE POLICY "Admin can update guides" ON public.guides FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Only admin can delete
CREATE POLICY "Admin can delete guides" ON public.guides FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for guide videos
INSERT INTO storage.buckets (id, name, public) VALUES ('guide-videos', 'guide-videos', true);

-- Storage policies for guide-videos bucket
CREATE POLICY "Anyone can view guide videos" ON storage.objects FOR SELECT USING (bucket_id = 'guide-videos');
CREATE POLICY "Admin can upload guide videos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'guide-videos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete guide videos" ON storage.objects FOR DELETE USING (bucket_id = 'guide-videos' AND public.has_role(auth.uid(), 'admin'));
