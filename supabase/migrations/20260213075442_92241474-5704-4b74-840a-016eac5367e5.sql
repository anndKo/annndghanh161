
-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  gender TEXT DEFAULT 'private',
  birth_date DATE,
  region TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  hobbies TEXT[] DEFAULT '{}',
  avatar_url TEXT,
  search_status TEXT, -- current search type: friend, lover, date, etc.
  search_code TEXT UNIQUE, -- generated code when searching
  is_online BOOLEAN DEFAULT false,
  last_online TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Relationships table
CREATE TABLE public.relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL, -- friend, lover, date, brother, sister, big_sister, big_brother, other
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, rejected
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, partner_id)
);

ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own relationships" ON public.relationships FOR SELECT USING (auth.uid() = user_id OR auth.uid() = partner_id);
CREATE POLICY "Users can create relationships" ON public.relationships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own relationships" ON public.relationships FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = partner_id);
CREATE POLICY "Users can delete own relationships" ON public.relationships FOR DELETE USING (auth.uid() = user_id OR auth.uid() = partner_id);

-- Enable realtime for profiles
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.relationships;

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'Player'), COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::text, 8)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_relationships_updated_at BEFORE UPDATE ON public.relationships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Generate search code function
CREATE OR REPLACE FUNCTION public.generate_search_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_count INT;
BEGIN
  LOOP
    code := upper(substr(md5(random()::text), 1, 6));
    SELECT COUNT(*) INTO exists_count FROM public.profiles WHERE search_code = code;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql SET search_path = public;
