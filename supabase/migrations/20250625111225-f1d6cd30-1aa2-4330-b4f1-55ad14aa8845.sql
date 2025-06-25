
-- Create contests table
CREATE TABLE public.contests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  max_participants INTEGER,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'ended', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create problems table
CREATE TABLE public.problems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id UUID REFERENCES public.contests(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  points INTEGER NOT NULL DEFAULT 100,
  time_limit_seconds INTEGER DEFAULT 5,
  memory_limit_mb INTEGER DEFAULT 256,
  problem_order INTEGER NOT NULL,
  sample_input TEXT,
  sample_output TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create test cases table
CREATE TABLE public.test_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  problem_id UUID REFERENCES public.problems(id) ON DELETE CASCADE NOT NULL,
  input_data TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_sample BOOLEAN DEFAULT false,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create submissions table
CREATE TABLE public.submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  problem_id UUID REFERENCES public.problems(id) NOT NULL,
  contest_id UUID REFERENCES public.contests(id) NOT NULL,
  code TEXT NOT NULL,
  language TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'accepted', 'wrong_answer', 'time_limit_exceeded', 'runtime_error', 'compilation_error')),
  score INTEGER DEFAULT 0,
  execution_time_ms INTEGER,
  memory_used_mb INTEGER,
  test_cases_passed INTEGER DEFAULT 0,
  total_test_cases INTEGER DEFAULT 0,
  error_message TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contest participants table
CREATE TABLE public.contest_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id UUID REFERENCES public.contests(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contest_id, user_id)
);

-- Create leaderboard view for real-time updates
CREATE OR REPLACE VIEW public.contest_leaderboard AS
SELECT 
  cp.contest_id,
  cp.user_id,
  p.full_name,
  p.username,
  COALESCE(SUM(s.score), 0) as total_score,
  COUNT(DISTINCT CASE WHEN s.status = 'accepted' THEN s.problem_id END) as problems_solved,
  MAX(s.submitted_at) as last_submission_time,
  cp.joined_at,
  ROW_NUMBER() OVER (PARTITION BY cp.contest_id ORDER BY COALESCE(SUM(s.score), 0) DESC, COUNT(DISTINCT CASE WHEN s.status = 'accepted' THEN s.problem_id END) DESC, MAX(s.submitted_at) ASC) as rank
FROM public.contest_participants cp
LEFT JOIN public.submissions s ON cp.contest_id = s.contest_id AND cp.user_id = s.user_id
LEFT JOIN public.profiles p ON cp.user_id = p.id
GROUP BY cp.contest_id, cp.user_id, p.full_name, p.username, cp.joined_at;

-- Enable Row Level Security
ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contests
CREATE POLICY "Anyone can view active contests" ON public.contests FOR SELECT USING (status = 'active');
CREATE POLICY "Contest creators can manage their contests" ON public.contests FOR ALL USING (auth.uid() = created_by);
CREATE POLICY "Admins can manage all contests" ON public.contests FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for problems
CREATE POLICY "Users can view problems in active contests" ON public.problems FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.contests WHERE id = contest_id AND status = 'active')
);
CREATE POLICY "Contest creators can manage problems" ON public.problems FOR ALL USING (
  EXISTS (SELECT 1 FROM public.contests WHERE id = contest_id AND created_by = auth.uid())
);
CREATE POLICY "Admins can manage all problems" ON public.problems FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for test cases
CREATE POLICY "Contest creators can manage test cases" ON public.test_cases FOR ALL USING (
  EXISTS (SELECT 1 FROM public.problems p JOIN public.contests c ON p.contest_id = c.id 
          WHERE p.id = problem_id AND c.created_by = auth.uid())
);
CREATE POLICY "Admins can manage all test cases" ON public.test_cases FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for submissions
CREATE POLICY "Users can view their own submissions" ON public.submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create submissions" ON public.submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Contest creators can view all submissions for their contests" ON public.submissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.contests WHERE id = contest_id AND created_by = auth.uid())
);
CREATE POLICY "Admins can view all submissions" ON public.submissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for contest participants
CREATE POLICY "Users can join contests" ON public.contest_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view contest participants" ON public.contest_participants FOR SELECT USING (true);
CREATE POLICY "Contest creators can manage participants" ON public.contest_participants FOR ALL USING (
  EXISTS (SELECT 1 FROM public.contests WHERE id = contest_id AND created_by = auth.uid())
);

-- Enable realtime for leaderboard updates
ALTER TABLE public.submissions REPLICA IDENTITY FULL;
ALTER TABLE public.contest_participants REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contest_participants;
