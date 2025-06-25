
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Memory, Trophy } from "lucide-react";

interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: string | null;
  points: number;
  time_limit_seconds: number | null;
  memory_limit_mb: number | null;
  sample_input: string | null;
  sample_output: string | null;
}

interface ProblemPanelProps {
  problem?: Problem;
}

const ProblemPanel = ({ problem }: ProblemPanelProps) => {
  if (!problem) {
    return (
      <div className="h-full bg-slate-800 p-6 flex items-center justify-center">
        <div className="text-slate-400">Select a problem to view details</div>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-800 overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">{problem.title}</h1>
          <div className="flex items-center space-x-2">
            {problem.difficulty && (
              <Badge 
                variant="outline" 
                className={`${
                  problem.difficulty === 'Easy' ? 'text-green-400 border-green-400' :
                  problem.difficulty === 'Medium' ? 'text-yellow-400 border-yellow-400' :
                  'text-red-400 border-red-400'
                }`}
              >
                {problem.difficulty}
              </Badge>
            )}
            <Badge className="bg-cyan-600 text-white">
              <Trophy className="h-3 w-3 mr-1" />
              {problem.points} pts
            </Badge>
          </div>
        </div>

        <div className="flex items-center space-x-6 mb-6 text-sm text-slate-400">
          {problem.time_limit_seconds && (
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{problem.time_limit_seconds}s</span>
            </div>
          )}
          {problem.memory_limit_mb && (
            <div className="flex items-center space-x-1">
              <Memory className="h-4 w-4" />
              <span>{problem.memory_limit_mb}MB</span>
            </div>
          )}
        </div>

        <Card className="bg-slate-900 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white text-lg">Problem Description</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-slate-300 whitespace-pre-wrap">
              {problem.description}
            </div>
          </CardContent>
        </Card>

        {problem.sample_input && problem.sample_output && (
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-sm">Sample Input</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-slate-300 text-sm bg-slate-800 p-3 rounded overflow-x-auto">
                  {problem.sample_input}
                </pre>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-sm">Sample Output</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-slate-300 text-sm bg-slate-800 p-3 rounded overflow-x-auto">
                  {problem.sample_output}
                </pre>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProblemPanel;
