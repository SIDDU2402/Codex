
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Calendar, Users, Trophy, Settings } from 'lucide-react';
import { useAdminContests } from '@/hooks/useContests';
import { useUpdateContestStatus } from '@/hooks/useAdmin';
import CreateContestForm from './CreateContestForm';
import ContestProblemManager from './ContestProblemManager';
import ContestStatsManager from './ContestStatsManager';

const ContestDashboard = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContest, setSelectedContest] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const { data: contests, isLoading, error } = useAdminContests();
  const updateContestStatus = useUpdateContestStatus();

  const filteredContests = contests?.filter(contest =>
    contest.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contest.description.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-600';
      case 'draft':
        return 'bg-blue-600';
      case 'completed':
        return 'bg-gray-600';
      case 'ended':
        return 'bg-gray-600';
      case 'cancelled':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'draft':
        return 'active';
      case 'active':
        return 'ended';
      case 'ended':
        return 'active';
      case 'cancelled':
        return 'draft';
      default:
        return 'active';
    }
  };

  const getStatusActionText = (currentStatus: string) => {
    switch (currentStatus) {
      case 'draft':
        return 'Activate';
      case 'active':
        return 'End Contest';
      case 'ended':
        return 'Reactivate';
      case 'cancelled':
        return 'Reactivate';
      default:
        return 'Activate';
    }
  };

  const handleStatusChange = async (contestId: string, currentStatus: string) => {
    try {
      const newStatus = getNextStatus(currentStatus);
      console.log(`Updating contest ${contestId} from ${currentStatus} to ${newStatus}`);
      await updateContestStatus.mutateAsync({ contestId, status: newStatus });
    } catch (error) {
      console.error('Failed to update contest status:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading contests...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-red-400 text-lg">Error loading contests</div>
      </div>
    );
  }

  const selectedContestData = contests?.find(c => c.id === selectedContest);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Contest Management</h1>
            <p className="text-slate-300">Manage your programming contests and competitions</p>
          </div>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Contest
          </Button>
        </div>

        {selectedContest && selectedContestData ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Button
                  onClick={() => setSelectedContest(null)}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:text-white mr-4"
                >
                  ← Back to All Contests
                </Button>
                <h2 className="text-2xl font-bold text-white inline-block">
                  {selectedContestData.title}
                </h2>
              </div>
              <TabsList className="bg-slate-800 border-slate-700">
                <TabsTrigger value="overview" className="text-slate-300 data-[state=active]:text-white">
                  <Trophy className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="problems" className="text-slate-300 data-[state=active]:text-white">
                  <Settings className="h-4 w-4 mr-2" />
                  Problems
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-6">
              <ContestStatsManager contest={selectedContestData} />
            </TabsContent>

            <TabsContent value="problems" className="space-y-6">
              <ContestProblemManager contestId={selectedContest} />
            </TabsContent>
          </Tabs>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    placeholder="Search contests..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-800 border-slate-700 text-white placeholder-slate-400"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredContests.map((contest) => (
                <Card key={contest.id} className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors cursor-pointer"
                      onClick={() => setSelectedContest(contest.id)}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white text-lg">{contest.title}</CardTitle>
                      <Badge className={`${getStatusColor(contest.status)} text-white`}>
                        {contest.status.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-300 mb-4 line-clamp-2">{contest.description}</p>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-slate-400">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>
                          {new Date(contest.start_time).toLocaleDateString()} - {new Date(contest.end_time).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center text-slate-400">
                        <Users className="h-4 w-4 mr-2" />
                        <span>Created {new Date(contest.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 mt-4">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(contest.id, contest.status);
                        }}
                        variant="outline"
                        size="sm"
                        className="border-slate-600 text-slate-300 hover:text-white"
                        disabled={updateContestStatus.isPending}
                      >
                        {updateContestStatus.isPending ? 'Updating...' : getStatusActionText(contest.status)}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredContests.length === 0 && (
              <div className="text-center py-12">
                <Trophy className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No contests found</h3>
                <p className="text-slate-400">
                  {searchTerm ? 'Try adjusting your search terms' : 'Create your first contest to get started'}
                </p>
              </div>
            )}
          </>
        )}

        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="max-w-2xl w-full">
              <CreateContestForm />
              <Button
                onClick={() => setShowCreateForm(false)}
                variant="outline"
                className="mt-4 border-slate-600 text-slate-300 hover:text-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContestDashboard;
