
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateProblem } from '@/hooks/useAdmin';
import { useContestProblems } from '@/hooks/useContests';
import { Plus, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import EnhancedProblemView from '../EnhancedProblemView';
import ProblemCard from './ProblemCard';

interface ProblemManagerProps {
  contestId: string;
}

const ProblemManager = ({ contestId }: ProblemManagerProps) => {
  const [showProblemForm, setShowProblemForm] = useState(false);
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

  const { data: problems, isLoading } = useContestProblems(contestId);
  const createProblem = useCreateProblem();
  const { toast } = useToast();

  const handleCreateProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!problemForm.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Problem title is required.",
        variant: "destructive",
      });
      return;
    }

    if (!problemForm.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Problem description is required.",
        variant: "destructive",
      });
      return;
    }

    if (problemForm.points <= 0) {
      toast({
        title: "Validation Error",
        description: "Points must be greater than 0.",
        variant: "destructive",
      });
      return;
    }
    
    const problemOrder = (problems?.length || 0) + 1;
    
    try {
      await createProblem.mutateAsync({
        contest_id: contestId,
        problem_order: problemOrder,
        title: problemForm.title.trim(),
        description: problemForm.description.trim(),
        difficulty: problemForm.difficulty,
        points: problemForm.points,
        time_limit_seconds: problemForm.time_limit_seconds,
        memory_limit_mb: problemForm.memory_limit_mb,
        sample_input: problemForm.sample_input.trim() || undefined,
        sample_output: problemForm.sample_output.trim() || undefined,
      });
      
      // Reset form on success
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
    } catch (error) {
      console.error('Problem creation failed:', error);
    }
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
              className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Problem Manager
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-slate-300">Loading problems...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Problem Management</h3>
          <p className="text-slate-400 text-sm">
            {problems?.length || 0} problem{(problems?.length || 0) !== 1 ? 's' : ''} created
          </p>
        </div>
        <Button
          onClick={() => setShowProblemForm(!showProblemForm)}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          {showProblemForm ? 'Cancel' : 'Add Problem'}
        </Button>
      </div>

      {showProblemForm && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Create New Problem</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateProblem} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Title *</Label>
                  <Input
                    value={problemForm.title}
                    onChange={(e) => setProblemForm(prev => ({ ...prev, title: e.target.value }))}
                    required
                    placeholder="Enter problem title"
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
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
                <Label className="text-slate-300">Description *</Label>
                <Textarea
                  value={problemForm.description}
                  onChange={(e) => setProblemForm(prev => ({ ...prev, description: e.target.value }))}
                  required
                  rows={4}
                  placeholder="Enter detailed problem description"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-slate-300">Points *</Label>
                  <Input
                    type="number"
                    value={problemForm.points}
                    onChange={(e) => setProblemForm(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                    min="1"
                    required
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Time Limit (seconds)</Label>
                  <Input
                    type="number"
                    value={problemForm.time_limit_seconds}
                    onChange={(e) => setProblemForm(prev => ({ ...prev, time_limit_seconds: parseInt(e.target.value) || 1 }))}
                    min="1"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Memory Limit (MB)</Label>
                  <Input
                    type="number"
                    value={problemForm.memory_limit_mb}
                    onChange={(e) => setProblemForm(prev => ({ ...prev, memory_limit_mb: parseInt(e.target.value) || 1 }))}
                    min="1"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Sample Input</Label>
                  <Textarea
                    value={problemForm.sample_input}
                    onChange={(e) => setProblemForm(prev => ({ ...prev, sample_input: e.target.value }))}
                    rows={3}
                    placeholder="Optional sample input"
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Sample Output</Label>
                  <Textarea
                    value={problemForm.sample_output}
                    onChange={(e) => setProblemForm(prev => ({ ...prev, sample_output: e.target.value }))}
                    rows={3}
                    placeholder="Optional sample output"
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="flex space-x-2">
                <Button 
                  type="submit" 
                  disabled={createProblem.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {createProblem.isPending ? 'Creating...' : 'Create Problem'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowProblemForm(false)}
                  className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {problems && problems.length > 0 ? (
          problems.map((problem) => (
            <ProblemCard 
              key={problem.id}
              problem={problem}
              onPreview={() => setPreviewProblem(problem.id)}
            />
          ))
        ) : (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-8 text-center">
              <div className="text-slate-400">
                <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No problems created yet</p>
                <p className="text-sm">Click "Add Problem" to create your first problem</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProblemManager;
