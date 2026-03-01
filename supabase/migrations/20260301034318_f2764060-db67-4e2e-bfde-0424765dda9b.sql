
-- Add missing columns to messages table for edit, recall, and reply functionality
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_edited boolean NOT NULL DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_recalled boolean NOT NULL DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_id uuid;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_content text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_sender_name text;

-- Allow sender to update their own messages (for edit and recall)
CREATE POLICY "Users can update their own sent messages"
ON public.messages
FOR UPDATE
USING (auth.uid() = sender_id);

-- Drop old policy that only allowed receiver to update (mark as read)
DROP POLICY IF EXISTS "Users can update their received messages (mark as read)" ON public.messages;

-- New policy: users can update messages they sent OR received
CREATE POLICY "Users can update their messages"
ON public.messages
FOR UPDATE
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
