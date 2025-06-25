
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useEvaluateSubmission = () => {
  return useMutation({
    mutationFn: async (submissionId: string) => {
      const { data, error } = await supabase.functions.invoke('evaluate-submission', {
        body: { submissionId }
      });

      if (error) throw error;
      return data;
    },
  });
};
