-- Quiz Results ve Learned Words tablo oluşturmaları
-- Bu dosyayı Supabase SQL editöründe çalıştırabilirsiniz

-- Quiz Results tablosu
CREATE TABLE IF NOT EXISTS public.quiz_results (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    level VARCHAR(2) NOT NULL,
    correct_count INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    success_rate INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RLS (Row Level Security) policies for quiz_results
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

-- Users can only access their own quiz results
CREATE POLICY "Users can access their own quiz results"
ON public.quiz_results
FOR SELECT
USING (auth.uid() = user_id);

-- Users can only insert their own quiz results
CREATE POLICY "Users can insert their own quiz results"
ON public.quiz_results
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own quiz results
CREATE POLICY "Users can update their own quiz results"
ON public.quiz_results
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can only delete their own quiz results
CREATE POLICY "Users can delete their own quiz results"
ON public.quiz_results
FOR DELETE
USING (auth.uid() = user_id);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS quiz_results_user_id_idx ON public.quiz_results (user_id);
CREATE INDEX IF NOT EXISTS quiz_results_timestamp_idx ON public.quiz_results (timestamp DESC);

-- Mevcut learned_words tablosunu DROP edelim eğer varsa
DROP TABLE IF EXISTS public.learned_words;

-- Öğrenilen kelimeler tablosu
CREATE TABLE IF NOT EXISTS public.learned_words (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    word_english TEXT NOT NULL,
    word_turkish TEXT NOT NULL,
    level VARCHAR(2) NOT NULL,
    learned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    review_count INTEGER DEFAULT 0,
    mastery_level INTEGER DEFAULT 0,
    UNIQUE(user_id, word_english)
);

-- RLS (Row Level Security) policies for learned_words
ALTER TABLE public.learned_words ENABLE ROW LEVEL SECURITY;

-- Users can only access their own learned words
CREATE POLICY "Users can access their own learned words"
ON public.learned_words
FOR SELECT
USING (auth.uid() = user_id);

-- Users can only insert their own learned words
CREATE POLICY "Users can insert their own learned words"
ON public.learned_words
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own learned words
CREATE POLICY "Users can update their own learned words"
ON public.learned_words
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can only delete their own learned words
CREATE POLICY "Users can delete their own learned words"
ON public.learned_words
FOR DELETE
USING (auth.uid() = user_id);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS learned_words_user_id_idx ON public.learned_words (user_id);
CREATE INDEX IF NOT EXISTS learned_words_level_idx ON public.learned_words (level);
CREATE INDEX IF NOT EXISTS learned_words_learned_at_idx ON public.learned_words (learned_at DESC);
CREATE INDEX IF NOT EXISTS learned_words_last_reviewed_idx ON public.learned_words (last_reviewed_at DESC);

-- Kullanıcı ilerleme tablosu
CREATE TABLE IF NOT EXISTS public.user_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    level VARCHAR(10) DEFAULT 'beginner',
    total_words INTEGER DEFAULT 0,
    learned_words INTEGER DEFAULT 0,
    study_streak INTEGER DEFAULT 0,
    last_study_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- RLS (Row Level Security) policies for user_progress
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Users can only access their own progress
CREATE POLICY "Users can access their own progress"
ON public.user_progress
FOR SELECT
USING (auth.uid() = user_id);

-- Users can only insert their own progress
CREATE POLICY "Users can insert their own progress"
ON public.user_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own progress
CREATE POLICY "Users can update their own progress"
ON public.user_progress
FOR UPDATE
USING (auth.uid() = user_id);

-- Profiles tablosu (eğer yoksa oluşturulur)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    study_streak INTEGER DEFAULT 0,
    last_study_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can only access their own profiles
CREATE POLICY "Users can access their own profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Users can only update their own profiles
CREATE POLICY "Users can update their own profiles"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Function to auto-create user progress when a new user registers
CREATE OR REPLACE FUNCTION public.create_user_progress()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_progress (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'create_user_progress_on_signup'
    ) THEN
        CREATE TRIGGER create_user_progress_on_signup
        AFTER INSERT ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION public.create_user_progress();
    END IF;
END
$$; 