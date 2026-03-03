
CREATE TABLE public.pinned_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pinned_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, pinned_user_id)
);

ALTER TABLE public.pinned_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pins"
ON public.pinned_conversations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pins"
ON public.pinned_conversations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own pins"
ON public.pinned_conversations
FOR DELETE
USING (auth.uid() = user_id);
