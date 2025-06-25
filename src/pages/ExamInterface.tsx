
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ChevronLeft, 
  ChevronRight, 
  Users,
  Flag,
  HelpCircle
} from "lucide-react";
import Timer from "@/components/Timer";
import ProblemPanel from "@/components/ProblemPanel";
import CodeEditor from "@/components/CodeEditor";
import { useContestProblems, useContestLeaderboard } from "@/hooks/useContests";
import { useRealtimeLeaderboard } from "@/hooks/useRealtime";

interface ExamInterfaceProps {
  contestId: string;
  onBack: () => void;
}

const ExamInterface = ({ contestId, onBack }: ExamInterfaceProps) => {
  const [currentProblem, setCurrentProblem] = useState(1);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [submittedProblems, setSubmittedProblems] = useState<number[]>([]);
  
  const { data: problems, isLoading: problemsLoading } = useContestProblems(contestId);
  const { data: leaderboard } = useContestLeaderboard(contestId);
  
  // Set up real-time leaderboard updates
  useRealtimeLeaderboard(contestId);

  const handleTimeUp = () => {
    alert("Time's up! Your solutions will be automatically submitted.");
    // Auto-submit logic would go here
  };

  const handleSubmit = () => {
    if (!submittedProblems.includes(currentProblem)) {
      setSubmittedProblems([...submittedProblems, currentProblem]);
    }
  };

  if (problemsLoading) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading contest...</div>
      </div>
    );
  }

  if (!problems || problems.length === 0) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">No problems found for this contest</div>
      </div>
    );
  }

  const currentProblemData = problems[currentProblem - 1];

  return (
    <div className="h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={onBack} 
            className="text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Contests
          </Button>
          <div className="h-6 w-px bg-slate-600" />
          <h1 className="text-lg font-semibold text-white">Contest #{contestId.slice(0, 8)}</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <Users className="h-4 w-4 mr-2" />
            Leaderboard
          </Button>
          <div className="text-sm text-slate-400">
            Problem {currentProblem} of {problems.length}
          </div>
          <Timer duration={10800} onTimeUp={handleTimeUp} />
        </div>
      </header>

      <div className="flex-1 flex relative">
        {/* Problem Navigation Sidebar */}
        <div className="w-64 border-r border-slate-700 bg-slate-800 p-4">
          <h3 className="text-sm font-semibold text-white mb-4">Problems</h3>
          <div className="space-y-2">
            {problems.map((problem, index) => (
              <Card 
                key={problem.id}
                className={`cursor-pointer transition-all hover:bg-slate-700/50 ${
                  currentProblem === index + 1
                    ? 'bg-slate-700 border-cyan-500' 
                    : 'bg-slate-800/50 border-slate-700'
                }`}
                onClick={() => setCurrentProblem(index + 1)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">
                      {index + 1}. {problem.title}
                    </span>
                    {submittedProblems.includes(index + 1) && (
                      <Badge className="bg-green-600 text-white text-xs">
                        ✓
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge 
                      variant="outline" 
                      className={`text-xs border-slate-600 ${
                        problem.difficulty === 'Easy' ? 'text-green-400' :
                        problem.difficulty === 'Medium' ? 'text-yellow-400' :
                        'text-red-400'
                      }`}
                    >
                      {problem.difficulty}
                    </Badge>
                    <span className="text-xs text-slate-400">{problem.points} pts</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="mt-6 p-3 bg-slate-900 rounded-lg">
            <div className="text-xs text-slate-400 mb-2">Your Progress</div>
            <div className="text-sm text-white">
              {submittedProblems.length}/{problems.length} Completed
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
              <div 
                className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(submittedProblems.length / problems.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex">
          {/* Problem Panel */}
          <div className="w-1/2 border-r border-slate-700">
            <ProblemPanel problem={currentProblemData} />
          </div>

          {/* Code Editor Panel */}
          <div className="w-1/2">
            <CodeEditor 
              problemId={currentProblemData?.id}
              contestId={contestId}
              onSubmit={handleSubmit}
            />
          </div>
        </div>

        {/* Leaderboard Overlay */}
        {showLeaderboard && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-96 max-h-96 bg-slate-800 border-slate-700">
              <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Live Leaderboard</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLeaderboard(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ×
                </Button>
              </div>
              <CardContent className="p-0">
                <div className="max-h-80 overflow-y-auto">
                  {leaderboard && leaderboard.length > 0 ? (
                    leaderboard.map((entry) => (
                      <div 
                        key={entry.user_id}
                        className="flex items-center justify-between p-4 border-b border-slate-700 last:border-b-0"
                      >
                        <div className="flex items-center space-x-3">
                          <Badge 
                            className={`text-xs ${
                              entry.rank === 1 ? 'bg-yellow-500' :
                              entry.rank === 2 ? 'bg-gray-400' :
                              entry.rank === 3 ? 'bg-orange-600' :
                              'bg-slate-600'
                            }`}
                          >
                            #{entry.rank}
                          </Badge>
                          <div>
                            <div className="text-sm font-medium text-white">
                              {entry.full_name || entry.username || 'Anonymous'}
                            </div>
                            <div className="text-xs text-slate-400">
                              {entry.problems_solved} problems
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-cyan-400">
                            {entry.total_score}
                          </div>
                          <div className="text-xs text-slate-400">
                            {entry.last_submission_time ? 
                              new Date(entry.last_submission_time).toLocaleTimeString() : 
                              'No submissions'
                            }
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-400">
                      No participants yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="border-t border-slate-700 bg-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white"
          >
            <Flag className="h-4 w-4 mr-2" />
            Flag for Review
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white"
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Help
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setCurrentProblem(Math.max(1, currentProblem - 1))}
            disabled={currentProblem === 1}
            className="border-slate-600 text-slate-300 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentProblem(Math.min(problems.length, currentProblem + 1))}
            disabled={currentProblem === problems.length}
            className="border-slate-600 text-slate-300 hover:text-white"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExamInterface;
