
import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ChevronLeft, 
  ChevronRight, 
  Users,
  Flag,
  HelpCircle,
  AlertTriangle
} from "lucide-react";
import Timer from "@/components/Timer";
import ProblemPanel from "@/components/ProblemPanel";
import CodeEditor from "@/components/CodeEditor";
import { useContestProblems, useContestLeaderboard } from "@/hooks/useContests";
import { useRealtimeLeaderboard } from "@/hooks/useRealtime";
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';

interface SecureExamInterfaceProps {
  contestId: string;
  onBack: () => void;
  onForceSubmit: () => void;
}

const SecureExamInterface = ({ contestId, onBack, onForceSubmit }: SecureExamInterfaceProps) => {
  const [currentProblem, setCurrentProblem] = useState(1);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [submittedProblems, setSubmittedProblems] = useState<number[]>([]);
  const [testCases, setTestCases] = useState<Array<{
    id: string;
    input_data: string;
    expected_output: string;
    is_sample: boolean;
    points: number;
  }>>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violations, setViolations] = useState(0);
  const [warningShown, setWarningShown] = useState(false);
  
  const { data: problems, isLoading: problemsLoading } = useContestProblems(contestId);
  const { data: leaderboard } = useContestLeaderboard(contestId);
  
  useRealtimeLeaderboard(contestId);

  // Fullscreen management
  const enterFullscreen = useCallback(() => {
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen();
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }, []);

  // Anti-cheat measures
  const handleFullscreenChange = useCallback(() => {
    const isCurrentlyFullscreen = !!document.fullscreenElement;
    setIsFullscreen(isCurrentlyFullscreen);
    
    if (!isCurrentlyFullscreen && violations === 0 && !warningShown) {
      setWarningShown(true);
      toast.error("Warning: Exiting fullscreen is prohibited. Next violation will auto-submit your test!");
      setViolations(1);
    } else if (!isCurrentlyFullscreen && violations >= 1) {
      toast.error("Test auto-submitted due to security violations!");
      onForceSubmit();
    }
  }, [violations, warningShown, onForceSubmit]);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    toast.error("Right-click is disabled during the contest!");
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Disable common copy/paste shortcuts
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
      if (e.target && (e.target as HTMLElement).tagName !== 'TEXTAREA' && 
          !(e.target as HTMLElement).classList.contains('monaco-editor')) {
        e.preventDefault();
        toast.error("Copy/paste is restricted outside the code editor!");
      }
    }
    
    // Disable F12, F11, etc.
    if (e.key === 'F12' || e.key === 'F11' || 
        (e.key === 'I' && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
      e.preventDefault();
      toast.error("Developer tools are disabled during the contest!");
    }

    // Disable Alt+Tab
    if (e.altKey && e.key === 'Tab') {
      e.preventDefault();
      toast.error("Task switching is disabled during the contest!");
    }
  }, []);

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      toast.warning("Tab switching detected! Stay focused on the contest.");
    }
  }, []);

  useEffect(() => {
    // Enter fullscreen when component mounts
    enterFullscreen();
    
    // Add event listeners
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Prevent text selection on non-editor elements
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    
    return () => {
      // Cleanup
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      exitFullscreen();
    };
  }, [handleFullscreenChange, handleContextMenu, handleKeyDown, handleVisibilityChange, enterFullscreen, exitFullscreen]);

  // Load test cases for current problem
  useEffect(() => {
    const loadTestCases = async () => {
      if (problems && problems[currentProblem - 1]) {
        const currentProblemData = problems[currentProblem - 1];
        
        const { data: cases, error } = await supabase
          .from('test_cases')
          .select('*')
          .eq('problem_id', currentProblemData.id)
          .order('created_at', { ascending: true });
        
        if (!error && cases) {
          setTestCases(cases);
        } else {
          console.error('Error loading test cases:', error);
          setTestCases([]);
        }
      }
    };
    
    loadTestCases();
  }, [problems, currentProblem]);

  const handleTimeUp = () => {
    toast.error("Time's up! Your solutions will be automatically submitted.");
    onForceSubmit();
  };

  const handleSubmit = () => {
    if (!submittedProblems.includes(currentProblem)) {
      setSubmittedProblems([...submittedProblems, currentProblem]);
    }
  };

  const handleExitContest = () => {
    if (window.confirm("Are you sure you want to exit the contest? This will submit your current solutions.")) {
      exitFullscreen();
      onBack();
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
      {/* Security Warning Bar */}
      {!isFullscreen && (
        <div className="bg-red-600 text-white px-4 py-2 text-center font-semibold">
          <AlertTriangle className="inline h-4 w-4 mr-2" />
          WARNING: You must stay in fullscreen mode. Violations: {violations}/2
        </div>
      )}

      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={handleExitContest} 
            className="text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Exit Contest
          </Button>
          <div className="h-6 w-px bg-slate-600" />
          <h1 className="text-lg font-semibold text-white">Secure Contest Mode</h1>
          <Badge className="bg-red-600 text-white">MONITORED</Badge>
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
              testCases={testCases}
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

export default SecureExamInterface;
