
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, Trophy, Award, BarChart3, Clock } from 'lucide-react';
import { useContestStats, useReactivateContest } from '@/hooks/useAdmin';

interface Contest {
  id: string;
  title: string;
  description: string;
  status: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  max_participants: number;
  created_at: string;
  created_by: string;
  updated_at: string;
}

interface ContestStatsManagerProps {
  contest: Contest;
}

const ContestStatsManager = ({ contest }: ContestStatsManagerProps) => {
  const [showReactivateForm, setShowReactivateForm] = useState(false);
  const [reactivateData, setReactivateData] = useState({
    startDate: '',
    endDate: ''
  });

  const { data: stats, isLoading: statsLoading } = useContestStats(contest.id);
  const reactivateContest = useReactivateContest();

  const handleReactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reactivateData.startDate || !reactivateData.endDate) {
      return;
    }

    try {
      await reactivateContest.mutateAsync({
        contestId: contest.id,
        startDate: reactivateData.startDate,
        endDate: reactivateData.endDate
      });
      setShowReactivateForm(false);
      setReactivateData({ startDate: '', endDate: '' });
    } catch (error) {
      console.error('Failed to reactivate contest:', error);
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Set minimum date-time to current time
  const now = new Date();
  const minDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  return (
    <div className="space-y-6">
      {/* Contest Overview */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center">
              <Trophy className="h-5 w-5 mr-2" />
              Contest Overview
            </CardTitle>
            <Badge className={`${getStatusColor(contest.status)} text-white`}>
              {contest.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center text-slate-300">
              <Calendar className="h-4 w-4 mr-2" />
              <div>
                <div className="font-medium">Start Time</div>
                <div className="text-slate-400">{formatDateTime(contest.start_time)}</div>
              </div>
            </div>
            <div className="flex items-center text-slate-300">
              <Calendar className="h-4 w-4 mr-2" />
              <div>
                <div className="font-medium">End Time</div>
                <div className="text-slate-400">{formatDateTime(contest.end_time)}</div>
              </div>
            </div>
            <div className="flex items-center text-slate-300">
              <Clock className="h-4 w-4 mr-2" />
              <div>
                <div className="font-medium">Duration</div>
                <div className="text-slate-400">{contest.duration_minutes} minutes</div>
              </div>
            </div>
            <div className="flex items-center text-slate-300">
              <Users className="h-4 w-4 mr-2" />
              <div>
                <div className="font-medium">Max Participants</div>
                <div className="text-slate-400">{contest.max_participants || 'Unlimited'}</div>
              </div>
            </div>
          </div>

          {(contest.status === 'completed' || contest.status === 'cancelled') && (
            <div className="pt-4 border-t border-slate-700">
              <Button
                onClick={() => setShowReactivateForm(!showReactivateForm)}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                Reactivate Contest
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reactivate Contest Form */}
      {showReactivateForm && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Reactivate Contest</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleReactivate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate" className="text-slate-300">New Start Time</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={reactivateData.startDate}
                    onChange={(e) => setReactivateData(prev => ({ ...prev, startDate: e.target.value }))}
                    min={minDateTime}
                    required
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate" className="text-slate-300">New End Time</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={reactivateData.endDate}
                    onChange={(e) => setReactivateData(prev => ({ ...prev, endDate: e.target.value }))}
                    min={reactivateData.startDate || minDateTime}
                    required
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  type="submit"
                  disabled={reactivateContest.isPending}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  {reactivateContest.isPending ? 'Reactivating...' : 'Reactivate Contest'}
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowReactivateForm(false)}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:text-white"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Contest Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-300">Total Participants</p>
                <p className="text-2xl font-bold text-white">
                  {statsLoading ? '...' : stats?.totalParticipants || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Award className="h-8 w-8 text-green-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-300">Active Participants</p>
                <p className="text-2xl font-bold text-white">
                  {statsLoading ? '...' : stats?.activeParticipants || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-purple-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-300">Total Submissions</p>
                <p className="text-2xl font-bold text-white">
                  {statsLoading ? '...' : stats?.totalSubmissions || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Trophy className="h-8 w-8 text-yellow-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-300">Average Score</p>
                <p className="text-2xl font-bold text-white">
                  {statsLoading ? '...' : stats?.averageScore || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Participants */}
      {stats?.topParticipants && stats.topParticipants.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Trophy className="h-5 w-5 mr-2" />
              Top Participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topParticipants.map((participant, index) => (
                <div key={participant.user_id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-yellow-500 text-black' :
                      index === 1 ? 'bg-gray-400 text-black' :
                      index === 2 ? 'bg-amber-600 text-white' :
                      'bg-slate-600 text-white'
                    }`}>
                      {participant.rank}
                    </div>
                    <div className="ml-3">
                      <p className="text-white font-medium">{participant.full_name || participant.username}</p>
                      <p className="text-slate-400 text-sm">
                        {participant.problems_solved} problems solved
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{participant.total_score} pts</p>
                    {participant.last_submission_time && (
                      <p className="text-slate-400 text-sm">
                        {new Date(participant.last_submission_time).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ContestStatsManager;
