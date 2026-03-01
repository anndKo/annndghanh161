
-- Verify the columns exist (they were added in the previous migration that partially succeeded)
SELECT column_name FROM information_schema.columns WHERE table_name = 'messages' AND column_name IN ('is_edited', 'is_recalled', 'reply_to_id');
