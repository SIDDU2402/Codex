
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminContests, useContestLeaderboard } from '@/hooks/useContests';
import { useUpdateContestStatus } from '@/hooks/useAdmin';
import { Play, Pause, Square, Users, Trophy, Clock } from 'lucide-react';
import CreateContestForm from './CreateContestForm';
import ProblemManager from './ProblemManager';

const ContestDashboard = () => {
  const [selectedContest, setSelectedContest] = useState<string | null>(null);
  const { data: contests, isLoading, refetch } = useAdminContests();
  const updateContestStatus = useUpdateContestStatus();

  const handleStatusUpdate = (contestId: string, status: string) => {
    updateContestStatus.mutate({ contestId, status }, {
      onSuccess: () => {
        refetch();
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-white">Loading contests...</div>
        </div>
      </div>
    );
  }

  const activeContests = contests?.filter(c => c.status === 'active') || [];
  const draftContests = contests?.filter(c => c.status === 'draft') || [];
  const endedContests = contests?.filter(c => c.status === 'ended') || [];

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Contest Administration</h1>
          <p className="text-slate-400">Create and manage coding contests</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700">Overview</TabsTrigger>
            <TabsTrigger value="create" className="data-[state=active]:bg-slate-700">Create Contest</TabsTrigger>
            <TabsTrigger value="manage" className="data-[state=active]:bg-slate-700">Manage Problems</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-lg flex items-center">
                    <Play className="h-5 w-5 mr-2 text-green-500" />
                    Active Contests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-500">{activeContests.length}</div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-lg flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-yellow-500" />
                    Draft Contests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-500">{draftContests.length}</div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-lg flex items-center">
                    <Square className="h-5 w-5 mr-2 text-red-500" />
                    Ended Contests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-500">{endedContests.length}</div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">All Contests</h2>
              {contests && contests.length > 0 ? (
                contests.map((contest) => (
                  <ContestCard 
                    key={contest.id}
                    contest={contest}
                    onStatusUpdate={handleStatusUpdate}
                    onSelect={() => setSelectedContest(contest.id)}
                    isSelected={selectedContest === contest.id}
                  />
                ))
              ) : (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-6 text-center">
                    <p className="text-slate-400">No contests created yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="create">
            <CreateContestForm />
          </TabsContent>

          <TabsContent value="manage">
            {selectedContest ? (
              <ProblemManager contestId={selectedContest} />
            ) : (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-6 text-center">
                  <p className="text-slate-400">Select a contest from the Overview tab to manage its problems</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const ContestCard = ({ contest, onStatusUpdate, onSelect, isSelected }: any) => {
  const { data: leaderboard } = useContestLeaderboard(contest.id);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-600';
      case 'draft': return 'bg-yellow-600';
      case 'ended': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const canActivate = contest.status === 'draft';
  const canEnd = contest.status === 'active';

  return (
    <Card 
      className={`bg-slate-800 border-slate-700 cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-blue-500' : 'hover:bg-slate-750'
      }`}
      onClick={onSelect}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">{contest.title}</CardTitle>
            <p className="text-slate-400 text-sm mt-1">{contest.description}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(contest.status)}>
              {contest.status}
            </Badge>
            {contest.status === 'active' && (
              <Badge variant="outline" className="text-slate-300 border-slate-600">
                <Users className="h-3 w-3 mr-1" />
                {leaderboard?.length || 0} participants
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400">
            <div>Start: {new Date(contest.start_time).toLocaleString()}</div>
            <div>Duration: {contest.duration_minutes} minutes</div>
          </div>
          
          <div className="flex space-x-2">
            {canActivate && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusUpdate(contest.id, 'active');
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="h-4 w-4 mr-1" />
                Activate
              </Button>
            )}
            {canEnd && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusUpdate(contest.id, 'ended');
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                <Square className="h-4 w-4 mr-1" />
                End Contest
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContestDashboard;
