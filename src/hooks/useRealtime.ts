
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useRealtimeLeaderboard = (contestId: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!contestId) return;

    const channel = supabase
      .channel('leaderboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submissions',
          filter: `contest_id=eq.${contestId}`,
        },
        () => {
          // Invalidate leaderboard query when submissions change
          queryClient.invalidateQueries({
            queryKey: ['contest-leaderboard', contestId],
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contest_participants',
          filter: `contest_id=eq.${contestId}`,
        },
        () => {
          // Invalidate leaderboard query when participants change
          queryClient.invalidateQueries({
            queryKey: ['contest-leaderboard', contestId],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contestId, queryClient]);
};
