
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useIsAdmin = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['admin-check', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};

export const useCreateContest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (contestData: any) => {
      if (!user) throw new Error('Must be logged in to create contest');

      const { data, error } = await supabase
        .from('contests')
        .insert({
          ...contestData,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contests'] });
      toast.success('Contest created successfully!');
    },
    onError: (error: any) => {
      toast.error('Failed to create contest');
      console.error('Contest creation error:', error);
    },
  });
};

export const useUpdateContestStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contestId, status }: { contestId: string; status: string }) => {
      const { error } = await supabase
        .from('contests')
        .update({ status })
        .eq('id', contestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contests'] });
      toast.success('Contest status updated successfully!');
    },
    onError: () => {
      toast.error('Failed to update contest status');
    },
  });
};

export const useCreateProblem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (problemData: any) => {
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
    onError: (error: any) => {
      toast.error('Failed to create problem');
      console.error('Problem creation error:', error);
    },
  });
};

export const useDeleteProblem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (problemId: string) => {
      const { error } = await supabase
        .from('problems')
        .delete()
        .eq('id', problemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contest-problems'] });
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      toast.success('Problem deleted successfully!');
    },
    onError: (error: any) => {
      toast.error('Failed to delete problem');
      console.error('Problem deletion error:', error);
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

export const useCreateTestCase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (testCaseData: any) => {
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
    onError: (error: any) => {
      toast.error('Failed to create test case');
      console.error('Test case creation error:', error);
    },
  });
};
