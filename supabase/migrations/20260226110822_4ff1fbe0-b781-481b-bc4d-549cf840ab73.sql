
-- Create conversation_reports table
CREATE TABLE public.conversation_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  reported_user_id UUID NOT NULL,
  content TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  admin_response TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pinned_conversations table
CREATE TABLE public.pinned_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pinned_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, pinned_user_id)
);

-- Enable RLS
ALTER TABLE public.conversation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pinned_conversations ENABLE ROW LEVEL SECURITY;

-- RLS for conversation_reports
CREATE POLICY "Users can insert reports" ON public.conversation_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can view own reports" ON public.conversation_reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update reports" ON public.conversation_reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS for pinned_conversations
CREATE POLICY "Users can manage own pins" ON public.pinned_conversations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create storage bucket for report evidence
INSERT INTO storage.buckets (id, name, public) VALUES ('report-evidence', 'report-evidence', true);

-- Storage RLS
CREATE POLICY "Authenticated users can upload evidence" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'report-evidence');
CREATE POLICY "Anyone can view evidence" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'report-evidence');

-- Add updated_at trigger for reports
CREATE TRIGGER update_conversation_reports_updated_at BEFORE UPDATE ON public.conversation_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
