-- Create a trigger that automatically creates a notification when a new message is inserted
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
BEGIN
  -- Get sender display name
  SELECT display_name INTO sender_name 
  FROM public.profiles 
  WHERE user_id = NEW.sender_id 
  LIMIT 1;

  -- Create notification for receiver
  INSERT INTO public.notifications (user_id, type, title, message, related_id)
  VALUES (
    NEW.receiver_id,
    'new_message',
    'Tin nhắn mới',
    COALESCE(sender_name, 'Người dùng') || ': ' || LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END,
    NEW.sender_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS on_new_message_notify ON public.messages;
CREATE TRIGGER on_new_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();