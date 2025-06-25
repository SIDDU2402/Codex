
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Timer, Users, ChevronRight } from "lucide-react";
import { useJoinContest } from "@/hooks/useContests";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface Contest {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  max_participants: number | null;
  status: string;
}

interface ContestCardProps {
  contest: Contest;
  participantCount: number;
  onJoin: (contestId: string) => void;
}

const ContestCard = ({ contest, participantCount, onJoin }: ContestCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const joinContest = useJoinContest();

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const handleJoinClick = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      await joinContest.mutateAsync(contest.id);
      onJoin(contest.id);
    } catch (error) {
      console.error('Failed to join contest:', error);
    }
  };

  const isActive = contest.status === 'active';
  const startTime = new Date(contest.start_time);
  const endTime = new Date(contest.end_time);
  const now = new Date();
  
  const isStarted = now >= startTime;
  const isEnded = now >= endTime;

  let statusBadge = 'Starting Soon';
  let statusColor = 'secondary';
  
  if (isActive && isStarted && !isEnded) {
    statusBadge = 'Active';
    statusColor = 'default';
  } else if (isEnded) {
    statusBadge = 'Ended';
    statusColor = 'secondary';
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-300 hover:scale-105">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-white text-lg mb-2">{contest.title}</CardTitle>
            <p className="text-slate-300 text-sm">{contest.description}</p>
          </div>
          <Badge 
            variant={statusColor as any}
            className={statusBadge === 'Active' ? 'bg-green-500 hover:bg-green-600' : ''}
          >
            {statusBadge}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4 text-sm text-slate-400">
            <div className="flex items-center space-x-1">
              <Timer className="h-4 w-4" />
              <span>{formatDuration(contest.duration_minutes)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>{participantCount}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400">
            {isStarted ? 'Started' : 'Starts'}: {startTime.toLocaleDateString()}
          </div>
          <Button 
            onClick={handleJoinClick}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
            disabled={!isActive || isEnded || joinContest.isPending}
          >
            {joinContest.isPending ? 'Joining...' : 
             !user ? 'Sign In to Join' : 
             isEnded ? 'Contest Ended' :
             !isStarted ? 'Register' : 'Join Contest'}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContestCard;
