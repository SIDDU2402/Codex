
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, Trophy, RotateCcw, Eye } from 'lucide-react';
import { useUpdateContestStatus, useContestStats, useReactivateContest } from '@/hooks/useAdmin';
import { toast } from 'sonner';

interface Contest {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

interface ContestStatsManagerProps {
  contest: Contest;
}

const ContestStatsManager = ({ contest }: ContestStatsManagerProps) => {
  const [showReactivateForm, setShowReactivateForm] = useState(false);
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [showStats, setShowStats] = useState(false);
  
  const updateContestStatus = useUpdateContestStatus();
  const { data: stats, isLoading: statsLoading } = useContestStats(contest.id);
  const reactivateContest = useReactivateContest();

  const handleReactivate = async () => {
    if (!newStartDate || !newEndDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    const startDate = new Date(newStartDate);
    const endDate = new Date(newEndDate);

    if (startDate >= endDate) {
      toast.error('Start date must be before end date');
      return;
    }

    if (startDate < new Date()) {
      toast.error('Start date must be in the future');
      return;
    }

    try {
      await reactivateContest.mutateAsync({
        contestId: contest.id,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      setShowReactivateForm(false);
      setNewStartDate('');
      setNewEndDate('');
      toast.success('Contest reactivated successfully!');
    } catch (error) {
      console.error('Reactivate error:', error);
      toast.error('Failed to reactivate contest');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-600';
      case 'upcoming':
        return 'bg-blue-600';
      case 'completed':
        return 'bg-gray-600';
      case 'cancelled':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center">
            <Trophy className="h-5 w-5 mr-2" />
            Contest Management
          </CardTitle>
          <Badge className={`${getStatusColor(contest.status)} text-white`}>
            {contest.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-300">Start Date</Label>
            <div className="flex items-center mt-1">
              <Calendar className="h-4 w-4 text-slate-400 mr-2" />
              <span className="text-white text-sm">
                {new Date(contest.start_date).toLocaleString()}
              </span>
            </div>
          </div>
          <div>
            <Label className="text-slate-300">End Date</Label>
            <div className="flex items-center mt-1">
              <Calendar className="h-4 w-4 text-slate-400 mr-2" />
              <span className="text-white text-sm">
                {new Date(contest.end_date).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Button
            onClick={() => setShowStats(!showStats)}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:text-white"
          >
            <Eye className="h-4 w-4 mr-2" />
            {showStats ? 'Hide' : 'Show'} Statistics
          </Button>
          
          {(contest.status === 'completed' || contest.status === 'cancelled') && (
            <Button
              onClick={() => setShowReactivateForm(!showReactivateForm)}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:text-white"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reactivate Contest
            </Button>
          )}
        </div>

        {showStats && (
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-lg">Contest Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="text-slate-400">Loading statistics...</div>
              ) : stats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{stats.totalParticipants}</div>
                    <div className="text-sm text-slate-400">Total Participants</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{stats.activeParticipants}</div>
                    <div className="text-sm text-slate-400">Active Participants</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{stats.totalSubmissions}</div>
                    <div className="text-sm text-slate-400">Total Submissions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">{stats.averageScore}</div>
                    <div className="text-sm text-slate-400">Average Score</div>
                  </div>
                </div>
              ) : (
                <div className="text-slate-400">No statistics available</div>
              )}

              {stats?.topParticipants && stats.topParticipants.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-white font-semibold mb-3">Top Participants</h4>
                  <div className="space-y-2">
                    {stats.topParticipants.map((participant: any, index: number) => (
                      <div key={participant.user_id} className="flex items-center justify-between bg-slate-800 p-3 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge className={`${
                            index === 0 ? 'bg-yellow-500' :
                            index === 1 ? 'bg-gray-400' :
                            index === 2 ? 'bg-orange-600' :
                            'bg-slate-600'
                          } text-white text-xs`}>
                            #{index + 1}
                          </Badge>
                          <div>
                            <div className="text-white font-medium">
                              {participant.full_name || participant.username || 'Anonymous'}
                            </div>
                            <div className="text-xs text-slate-400">
                              {participant.problems_solved} problems solved
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-semibold">{participant.total_score}</div>
                          <div className="text-xs text-slate-400">points</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {showReactivateForm && (
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-lg">Reactivate Contest</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">New Start Date</Label>
                  <Input
                    type="datetime-local"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="bg-slate-800 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">New End Date</Label>
                  <Input
                    type="datetime-local"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="bg-slate-800 border-slate-600 text-white"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={handleReactivate}
                  disabled={reactivateContest.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {reactivateContest.isPending ? 'Reactivating...' : 'Reactivate Contest'}
                </Button>
                <Button
                  onClick={() => setShowReactivateForm(false)}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:text-white"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};

export default ContestStatsManager;
