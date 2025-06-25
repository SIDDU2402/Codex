import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Hook to check if current user is admin
export const useIsAdmin = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return { role: null };
      
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        return { role: null };
      }
      
      return data;
    },
    enabled: !!user?.id,
  });
};

export const useCreateContest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (contestData: {
      title: string;
      description?: string;
      start_time: string;
      duration_minutes: number;
      max_participants?: number;
    }) => {
      if (!user) throw new Error('Must be logged in to create contest');

      const end_time = new Date(
        new Date(contestData.start_time).getTime() + 
        contestData.duration_minutes * 60 * 1000
      ).toISOString();

      const { data, error } = await supabase
        .from('contests')
        .insert({
          ...contestData,
          end_time,
          created_by: user.id,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contests'] });
      toast.success('Contest created successfully!');
    },
    onError: () => {
      toast.error('Failed to create contest');
    },
  });
};

export const useCreateProblem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (problemData: {
      contest_id: string;
      title: string;
      description: string;
      difficulty: string;
      points: number;
      time_limit_seconds?: number;
      memory_limit_mb?: number;
      problem_order: number;
      sample_input?: string;
      sample_output?: string;
    }) => {
      const { data, error } = await supabase
        .from('problems')
        .insert(problemData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contest-problems'] });
      toast.success('Problem created successfully!');
    },
    onError: () => {
      toast.error('Failed to create problem');
    },
  });
};

export const useCreateTestCase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (testCaseData: {
      problem_id: string;
      input_data: string;
      expected_output: string;
      is_sample?: boolean;
      points?: number;
    }) => {
      const { data, error } = await supabase
        .from('test_cases')
        .insert(testCaseData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      toast.success('Test case created successfully!');
    },
    onError: () => {
      toast.error('Failed to create test case');
    },
  });
};

export const useUpdateContestStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contestId, status }: { contestId: string; status: string }) => {
      const { data, error } = await supabase
        .from('contests')
        .update({ status })
        .eq('id', contestId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contests'] });
      toast.success('Contest status updated successfully!');
    },
    onError: () => {
      toast.error('Failed to update contest status');
    },
  });
};

export const useTestCases = (problemId: string) => {
  return useQuery({
    queryKey: ['test-cases', problemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_cases')
        .select('*')
        .eq('problem_id', problemId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!problemId,
  });
};
