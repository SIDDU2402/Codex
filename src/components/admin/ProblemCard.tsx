
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Eye, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import TestCaseManager from './TestCaseManager';

interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  points: number;
  time_limit_seconds: number;
  memory_limit_mb: number;
  problem_order: number;
  sample_input?: string;
  sample_output?: string;
}

interface ProblemCardProps {
  problem: Problem;
  onPreview: () => void;
}

const ProblemCard = ({ problem, onPreview }: ProblemCardProps) => {
  const [showTestCases, setShowTestCases] = useState(false);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-600';
      case 'medium': return 'bg-yellow-600';
      case 'hard': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-slate-700 rounded-full w-8 h-8 flex items-center justify-center">
              <span className="text-white font-semibold text-sm">{problem.problem_order}</span>
            </div>
            <div>
              <CardTitle className="text-white text-lg">{problem.title}</CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge className={getDifficultyColor(problem.difficulty)}>
                  {problem.difficulty}
                </Badge>
                <span className="text-slate-400 text-sm">{problem.points} points</span>
                <span className="text-slate-400 text-sm">{problem.time_limit_seconds}s limit</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={onPreview}
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="mb-4">
          <p className="text-slate-300 text-sm line-clamp-2">{problem.description}</p>
        </div>

        {(problem.sample_input || problem.sample_output) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {problem.sample_input && (
              <div>
                <h5 className="text-slate-300 text-sm font-medium mb-1">Sample Input:</h5>
                <div className="bg-slate-900 p-2 rounded text-white text-sm font-mono">
                  {problem.sample_input}
                </div>
              </div>
            )}
            {problem.sample_output && (
              <div>
                <h5 className="text-slate-300 text-sm font-medium mb-1">Sample Output:</h5>
                <div className="bg-slate-900 p-2 rounded text-white text-sm font-mono">
                  {problem.sample_output}
                </div>
              </div>
            )}
          </div>
        )}

        <Collapsible open={showTestCases} onOpenChange={setShowTestCases}>
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              className="w-full border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage Test Cases
              {showTestCases ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <TestCaseManager problemId={problem.id} />
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default ProblemCard;
