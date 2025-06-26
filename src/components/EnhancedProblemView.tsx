import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTestCases } from '@/hooks/useAdmin';
import MonacoCodeEditor from './MonacoCodeEditor';
import TestCaseRunner from './TestCaseRunner';
import { Clock, HardDrive, Award } from 'lucide-react';

interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  points: number;
  time_limit_seconds: number;
  memory_limit_mb: number;
  sample_input?: string;
  sample_output?: string;
}

interface EnhancedProblemViewProps {
  problem: Problem;
  contestId: string;
  onSubmit?: () => void;
}

const EnhancedProblemView = ({ problem, contestId, onSubmit }: EnhancedProblemViewProps) => {
  const { data: testCases } = useTestCases(problem.id);
  const [activeTab, setActiveTab] = useState('problem');

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-600';
      case 'medium': return 'bg-yellow-600';
      case 'hard': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const sampleTestCases = testCases?.filter(tc => tc.is_sample) || [];

  return (
    <div className="h-screen bg-slate-900 flex">
      {/* Problem Panel */}
      <div className="w-1/2 border-r border-slate-700 flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">{problem.title}</h1>
            <div className="flex items-center space-x-2">
              <Badge className={getDifficultyColor(problem.difficulty)}>
                {problem.difficulty}
              </Badge>
              <Badge variant="outline" className="text-slate-300 border-slate-600">
                <Award className="h-3 w-3 mr-1" />
                {problem.points} pts
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-slate-400">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {problem.time_limit_seconds}s
            </div>
            <div className="flex items-center">
              <HardDrive className="h-4 w-4 mr-1" />
              {problem.memory_limit_mb}MB
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-slate-800 border-slate-700 mb-6">
              <TabsTrigger value="problem" className="data-[state=active]:bg-slate-700">
                Problem
              </TabsTrigger>
              <TabsTrigger value="examples" className="data-[state=active]:bg-slate-700">
                Examples
              </TabsTrigger>
              <TabsTrigger value="test-cases" className="data-[state=active]:bg-slate-700">
                Test Cases
              </TabsTrigger>
            </TabsList>

            <TabsContent value="problem" className="space-y-6">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-slate-300 whitespace-pre-wrap">
                    {problem.description}
                  </div>
                </CardContent>
              </Card>

              {(problem.sample_input || problem.sample_output) && (
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Sample</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {problem.sample_input && (
                      <div>
                        <h4 className="text-slate-400 mb-2">Input:</h4>
                        <pre className="bg-slate-900 p-3 rounded text-slate-300 overflow-x-auto">
                          {problem.sample_input}
                        </pre>
                      </div>
                    )}
                    {problem.sample_output && (
                      <div>
                        <h4 className="text-slate-400 mb-2">Output:</h4>
                        <pre className="bg-slate-900 p-3 rounded text-slate-300 overflow-x-auto">
                          {problem.sample_output}
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="examples">
              <div className="space-y-4">
                {sampleTestCases.map((testCase, index) => (
                  <Card key={testCase.id} className="bg-slate-800 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">
                        Example {index + 1}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="text-slate-400 mb-2">Input:</h4>
                        <pre className="bg-slate-900 p-3 rounded text-slate-300 overflow-x-auto">
                          {testCase.input_data}
                        </pre>
                      </div>
                      <div>
                        <h4 className="text-slate-400 mb-2">Output:</h4>
                        <pre className="bg-slate-900 p-3 rounded text-slate-300 overflow-x-auto">
                          {testCase.expected_output}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {sampleTestCases.length === 0 && (
                  <div className="text-center text-slate-400 py-8">
                    No sample test cases available
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="test-cases">
              <TestCaseRunner
                testCases={testCases || []}
                code=""
                language="javascript"
              />
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </div>

      {/* Code Editor Panel */}
      <div className="w-1/2 flex flex-col">
        <MonacoCodeEditor
          problemId={problem.id}
          contestId={contestId}
          onSubmit={onSubmit}
          testCases={testCases}
        />
      </div>
    </div>
  );
};

export default EnhancedProblemView;
