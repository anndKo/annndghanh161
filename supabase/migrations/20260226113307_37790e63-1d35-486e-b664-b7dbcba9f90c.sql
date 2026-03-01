
-- Create message_archives table to store all messages including recalled ones
CREATE TABLE public.message_archives (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_message_id uuid,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  content text NOT NULL,
  is_recalled boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  archived_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.message_archives ENABLE ROW LEVEL SECURITY;

-- Only admins can view archived messages
CREATE POLICY "Admins can view all archived messages"
  ON public.message_archives
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert archived messages
CREATE POLICY "System can insert archived messages"
  ON public.message_archives
  FOR INSERT
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_archives;

-- Create trigger to auto-archive messages on insert
CREATE OR REPLACE FUNCTION public.archive_message_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.message_archives (original_message_id, sender_id, receiver_id, content, is_recalled, created_at)
  VALUES (NEW.id, NEW.sender_id, NEW.receiver_id, NEW.content, false, NEW.created_at);
  RETURN NEW;
END;
$$;

CREATE TRIGGER archive_message_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_message_on_insert();
