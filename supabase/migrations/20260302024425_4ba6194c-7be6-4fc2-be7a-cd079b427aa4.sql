-- Ensure guest and logged-in users can submit forgot-password requests
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.password_reset_requests TO anon, authenticated;

-- Ensure tutors can create/view class requests (used by 'Lớp đang trống')
GRANT SELECT, INSERT ON TABLE public.class_requests TO anon, authenticated;