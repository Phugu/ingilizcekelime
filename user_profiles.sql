-- User Profiles table creation
-- You can run this in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    birth_date DATE,
    language_level VARCHAR(20) DEFAULT 'beginner',
    daily_goal INTEGER DEFAULT 10,
    learning_goals TEXT,
    notifications JSONB DEFAULT '{"daily_reminder": true, "weekly_summary": true}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT user_profiles_user_id_key UNIQUE (user_id)
);

-- RLS (Row Level Security) policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only access their own profiles
CREATE POLICY "Users can access their own profiles"
ON public.user_profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Users can only update their own profiles
CREATE POLICY "Users can update their own profiles"
ON public.user_profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can create their own profiles
CREATE POLICY "Users can create their own profiles"
ON public.user_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own profiles
CREATE POLICY "Users can delete their own profiles"
ON public.user_profiles
FOR DELETE
USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS user_profiles_user_id_idx ON public.user_profiles (user_id);

-- Function trigger: Auto-create profile when new user registers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Example comment
COMMENT ON TABLE public.user_profiles IS 'Table that stores user profile information'; 