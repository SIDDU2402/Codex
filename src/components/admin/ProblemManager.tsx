import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useCreateProblem, useCreateTestCase, useTestCases } from '@/hooks/useAdmin';
import { useContestProblems } from '@/hooks/useContests';
import { Plus, TestTube, Play, Eye, Trash2 } from 'lucide-react';
import EnhancedProblemView from '../EnhancedProblemView';

interface ProblemManagerProps {
  contestId: string;
}

const ProblemManager = ({ contestId }: ProblemManagerProps) => {
  const [showProblemForm, setShowProblemForm] = useState(false);
  const [showTestCaseForm, setShowTestCaseForm] = useState<string | null>(null);
  const [previewProblem, setPreviewProblem] = useState<string | null>(null);
  const [problemForm, setProblemForm] = useState({
    title: '',
    description: '',
    difficulty: 'Easy',
    points: 100,
    time_limit_seconds: 5,
    memory_limit_mb: 256,
    sample_input: '',
    sample_output: '',
  });
  const [testCaseForm, setTestCaseForm] = useState({
    input_data: '',
    expected_output: '',
    is_sample: false,
    points: 0,
  });

  const { data: problems } = useContestProblems(contestId);
  const createProblem = useCreateProblem();
  const createTestCase = useCreateTestCase();

  const handleCreateProblem = (e: React.FormEvent) => {
    e.preventDefault();
    
    const problemOrder = (problems?.length || 0) + 1;
    
    createProblem.mutate({
      contest_id: contestId,
      problem_order: problemOrder,
      ...problemForm,
    });
    
    setProblemForm({
      title: '',
      description: '',
      difficulty: 'Easy',
      points: 100,
      time_limit_seconds: 5,
      memory_limit_mb: 256,
      sample_input: '',
      sample_output: '',
    });
    setShowProblemForm(false);
  };

  const handleCreateTestCase = (e: React.FormEvent, problemId: string) => {
    e.preventDefault();
    
    createTestCase.mutate({
      problem_id: problemId,
      ...testCaseForm,
    });
    
    setTestCaseForm({
      input_data: '',
      expected_output: '',
      is_sample: false,
      points: 0,
    });
    setShowTestCaseForm(null);
  };

  // If preview mode is active, show the enhanced problem view
  if (previewProblem) {
    const problem = problems?.find(p => p.id === previewProblem);
    if (problem) {
      return (
        <div className="h-screen">
          <div className="p-4 bg-slate-800 border-b border-slate-700">
            <Button
              onClick={() => setPreviewProblem(null)}
              variant="outline"
              className="border-slate-600 text-slate-300"
            >
              ← Back to Problem Manager
            </Button>
          </div>
          <EnhancedProblemView
            problem={problem}
            contestId={contestId}
          />
        </div>
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Problem Management</h3>
        <Button
          onClick={() => setShowProblemForm(true)}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Problem
        </Button>
      </div>

      {showProblemForm && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Create New Problem</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateProblem} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Title</Label>
                  <Input
                    value={problemForm.title}
                    onChange={(e) => setProblemForm(prev => ({ ...prev, title: e.target.value }))}
                    required
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Difficulty</Label>
                  <Select value={problemForm.difficulty} onValueChange={(value) => setProblemForm(prev => ({ ...prev, difficulty: value }))}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-slate-300">Description</Label>
                <Textarea
                  value={problemForm.description}
                  onChange={(e) => setProblemForm(prev => ({ ...prev, description: e.target.value }))}
                  required
                  rows={4}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-slate-300">Points</Label>
                  <Input
                    type="number"
                    value={problemForm.points}
                    onChange={(e) => setProblemForm(prev => ({ ...prev, points: parseInt(e.target.value) }))}
                    min="1"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Time Limit (seconds)</Label>
                  <Input
                    type="number"
                    value={problemForm.time_limit_seconds}
                    onChange={(e) => setProblemForm(prev => ({ ...prev, time_limit_seconds: parseInt(e.target.value) }))}
                    min="1"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Memory Limit (MB)</Label>
                  <Input
                    type="number"
                    value={problemForm.memory_limit_mb}
                    onChange={(e) => setProblemForm(prev => ({ ...prev, memory_limit_mb: parseInt(e.target.value) }))}
                    min="1"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Sample Input</Label>
                  <Textarea
                    value={problemForm.sample_input}
                    onChange={(e) => setProblemForm(prev => ({ ...prev, sample_input: e.target.value }))}
                    rows={3}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Sample Output</Label>
                  <Textarea
                    value={problemForm.sample_output}
                    onChange={(e) => setProblemForm(prev => ({ ...prev, sample_output: e.target.value }))}
                    rows={3}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div className="flex space-x-2">
                <Button type="submit" disabled={createProblem.isPending}>
                  {createProblem.isPending ? 'Creating...' : 'Create Problem'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowProblemForm(false)}
                  className="border-slate-600 text-slate-300"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {problems?.map((problem) => (
          <ProblemCard 
            key={problem.id}
            problem={problem}
            onAddTestCase={() => setShowTestCaseForm(problem.id)}
            onPreview={() => setPreviewProblem(problem.id)}
            showTestCaseForm={showTestCaseForm === problem.id}
            onSubmitTestCase={(e) => handleCreateTestCase(e, problem.id)}
            testCaseForm={testCaseForm}
            setTestCaseForm={setTestCaseForm}
            createTestCase={createTestCase}
          />
        ))}
      </div>
    </div>
  );
};

const ProblemCard = ({ 
  problem, 
  onAddTestCase, 
  onPreview,
  showTestCaseForm, 
  onSubmitTestCase, 
  testCaseForm, 
  setTestCaseForm,
  createTestCase 
}: any) => {
  const { data: testCases } = useTestCases(problem.id);

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">{problem.title}</CardTitle>
            <div className="flex items-center space-x-2 mt-2">
              <Badge className={`${
                problem.difficulty === 'Easy' ? 'bg-green-600' :
                problem.difficulty === 'Medium' ? 'bg-yellow-600' :
                'bg-red-600'
              }`}>
                {problem.difficulty}
              </Badge>
              <Badge variant="outline" className="text-slate-300 border-slate-600">
                {problem.points} pts
              </Badge>
              <Badge variant="outline" className="text-slate-300 border-slate-600">
                {testCases?.length || 0} test cases
              </Badge>
              <Badge variant="outline" className="text-slate-300 border-slate-600">
                {problem.time_limit_seconds}s / {problem.memory_limit_mb}MB
              </Badge>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={onPreview}
              size="sm"
              variant="outline"
              className="border-slate-600 text-slate-300"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button
              onClick={onAddTestCase}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <TestTube className="h-4 w-4 mr-2" />
              Add Test Case
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {showTestCaseForm && (
        <CardContent className="border-t border-slate-700">
          <form onSubmit={onSubmitTestCase} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Input Data</Label>
                <Textarea
                  value={testCaseForm.input_data}
                  onChange={(e) => setTestCaseForm(prev => ({ ...prev, input_data: e.target.value }))}
                  required
                  rows={3}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Expected Output</Label>
                <Textarea
                  value={testCaseForm.expected_output}
                  onChange={(e) => setTestCaseForm(prev => ({ ...prev, expected_output: e.target.value }))}
                  required
                  rows={3}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={testCaseForm.is_sample}
                  onChange={(e) => setTestCaseForm(prev => ({ ...prev, is_sample: e.target.checked }))}
                  className="rounded"
                />
                <span>Sample Test Case</span>
              </label>
              
              <div>
                <Label className="text-slate-300">Points</Label>
                <Input
                  type="number"
                  value={testCaseForm.points}
                  onChange={(e) => setTestCaseForm(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                  min="0"
                  className="bg-slate-700 border-slate-600 text-white w-20"
                />
              </div>
            </div>

            <div className="flex space-x-2">
              <Button type="submit" size="sm" disabled={createTestCase.isPending}>
                {createTestCase.isPending ? 'Adding...' : 'Add Test Case'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setTestCaseForm({ input_data: '', expected_output: '', is_sample: false, points: 0 })}
                className="border-slate-600 text-slate-300"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      )}
    </Card>
  );
};

export default ProblemManager;
