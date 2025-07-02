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

      console.log('User ID:', user.id);
      console.log('Raw contest data:', contestData);

      // Ensure all required fields are present and properly typed
      const insertData = {
        title: contestData.title,
        description: contestData.description,
        start_time: contestData.start_time,
        end_time: contestData.end_time,
        duration_minutes: parseInt(contestData.duration_minutes),
        max_participants: contestData.max_participants ? parseInt(contestData.max_participants) : null,
        status: contestData.status || 'draft',
        created_by: user.id,
      };

      console.log('Processed insert data:', insertData);

      const { data, error } = await supabase
        .from('contests')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      console.log('Contest created successfully:', data);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-contests'] });
      queryClient.invalidateQueries({ queryKey: ['contests'] });
      console.log('Contest creation mutation succeeded:', data);
    },
    onError: (error: any) => {
      console.error('Contest creation mutation failed:', error);
    },
  });
};

export const useUpdateContestStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contestId, status }: { contestId: string; status: string }) => {
      console.log(`Updating contest ${contestId} to status: ${status}`);
      
      const updateData: any = { status };
      
      // If activating a contest, also update the start time to now
      if (status === 'active') {
        updateData.start_time = new Date().toISOString();
      }
      
      // If ending a contest, also update the end time to now
      if (status === 'ended') {
        updateData.end_time = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('contests')
        .update(updateData)
        .eq('id', contestId)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Contest updated successfully:', data);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-contests'] });
      queryClient.invalidateQueries({ queryKey: ['contests'] });
      toast.success(`Contest status updated to ${data.status} successfully!`);
    },
    onError: (error: any) => {
      console.error('Update contest status error:', error);
      toast.error('Failed to update contest status');
    },
  });
};

export const useReactivateContest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contestId, startDate, endDate }: { contestId: string; startDate: string; endDate: string }) => {
      const { error } = await supabase
        .from('contests')
        .update({ 
          status: 'draft',
          start_time: startDate,
          end_time: endDate
        })
        .eq('id', contestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contests'] });
      toast.success('Contest reactivated successfully!');
    },
    onError: () => {
      toast.error('Failed to reactivate contest');
    },
  });
};

export const useContestStats = (contestId: string) => {
  return useQuery({
    queryKey: ['contest-stats', contestId],
    queryFn: async () => {
      // Get participant count
      const { data: participants, error: participantsError } = await supabase
        .from('contest_participants')
        .select('user_id')
        .eq('contest_id', contestId);

      if (participantsError) throw participantsError;

      // Get submission statistics
      const { data: submissions, error: submissionsError } = await supabase
        .from('submissions')
        .select('user_id, score')
        .eq('contest_id', contestId);

      if (submissionsError) throw submissionsError;

      // Get leaderboard data
      const { data: leaderboard, error: leaderboardError } = await supabase
        .from('contest_leaderboard')
        .select('*')
        .eq('contest_id', contestId)
        .order('rank', { ascending: true })
        .limit(10);

      if (leaderboardError) throw leaderboardError;

      const totalParticipants = participants?.length || 0;
      const activeParticipants = [...new Set(submissions?.map(s => s.user_id))].length;
      const totalSubmissions = submissions?.length || 0;
      const averageScore = submissions?.length > 0 
        ? Math.round((submissions.reduce((sum, sub) => sum + (sub.score || 0), 0) / submissions.length) * 100) / 100
        : 0;

      return {
        totalParticipants,
        activeParticipants,
        totalSubmissions,
        averageScore,
        topParticipants: leaderboard || []
      };
    },
    enabled: !!contestId,
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
