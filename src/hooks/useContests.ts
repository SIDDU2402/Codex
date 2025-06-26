
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useContests = () => {
  return useQuery({
    queryKey: ['contests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

export const useAdminContests = () => {
  return useQuery({
    queryKey: ['admin-contests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

export const useJoinContest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (contestId: string) => {
      if (!user) throw new Error('Must be logged in to join contest');

      const { error } = await supabase
        .from('contest_participants')
        .insert({
          contest_id: contestId,
          user_id: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contests'] });
      toast.success('Successfully joined contest!');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('You are already registered for this contest');
      } else {
        toast.error('Failed to join contest');
      }
    },
  });
};

export const useContestProblems = (contestId: string) => {
  return useQuery({
    queryKey: ['contest-problems', contestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('problems')
        .select('*')
        .eq('contest_id', contestId)
        .order('problem_order', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!contestId,
  });
};

export const useSubmitCode = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      problemId,
      contestId,
      code,
      language,
    }: {
      problemId: string;
      contestId: string;
      code: string;
      language: string;
    }) => {
      if (!user) throw new Error('Must be logged in to submit code');

      const { data, error } = await supabase
        .from('submissions')
        .insert({
          user_id: user.id,
          problem_id: problemId,
          contest_id: contestId,
          code,
          language,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      toast.success('Code submitted successfully!');
    },
    onError: () => {
      toast.error('Failed to submit code');
    },
  });
};

export const useContestLeaderboard = (contestId: string) => {
  return useQuery({
    queryKey: ['contest-leaderboard', contestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contest_leaderboard')
        .select('*')
        .eq('contest_id', contestId)
        .order('rank', { ascending: true })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!contestId,
    refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
  });
};
