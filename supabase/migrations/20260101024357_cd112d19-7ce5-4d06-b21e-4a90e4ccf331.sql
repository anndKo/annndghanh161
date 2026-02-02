-- Make assignments bucket public so images can be displayed
UPDATE storage.buckets SET public = true WHERE id = 'assignments';

-- Create RLS policy for authenticated users to upload to assignments bucket
CREATE POLICY "Authenticated users can upload to assignments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'assignments');

-- Create RLS policy for public read access to assignments bucket  
CREATE POLICY "Public can view assignments files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'assignments');