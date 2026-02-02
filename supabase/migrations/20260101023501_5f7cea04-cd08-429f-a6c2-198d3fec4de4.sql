-- Allow authenticated users to search for profiles by user_id for messaging
CREATE POLICY "Authenticated users can search profiles for messaging" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);