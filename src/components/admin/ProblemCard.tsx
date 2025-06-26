
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTestCases, useCreateTestCase } from '@/hooks/useAdmin';
import { TestTube, Eye, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  points: number;
  time_limit_seconds: number;
  memory_limit_mb: number;
}

interface ProblemCardProps {
  problem: Problem;
  onPreview: () => void;
}

const ProblemCard = ({ problem, onPreview }: ProblemCardProps) => {
  const [showTestCaseForm, setShowTestCaseForm] = useState(false);
  const [testCaseForm, setTestCaseForm] = useState({
    input_data: '',
    expected_output: '',
    is_sample: false,
    points: 0,
  });

  const { data: testCases } = useTestCases(problem.id);
  const createTestCase = useCreateTestCase();
  const { toast } = useToast();

  const handleCreateTestCase = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!testCaseForm.input_data.trim() || !testCaseForm.expected_output.trim()) {
      toast({
        title: "Validation Error",
        description: "Both input and expected output are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createTestCase.mutateAsync({
        problem_id: problem.id,
        ...testCaseForm,
      });
      
      // Reset form on success
      setTestCaseForm({
        input_data: '',
        expected_output: '',
        is_sample: false,
        points: 0,
      });
      setShowTestCaseForm(false);
    } catch (error) {
      console.error('Test case creation failed:', error);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
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
          <div className="flex-1">
            <CardTitle className="text-white text-lg">{problem.title}</CardTitle>
            <div className="flex items-center space-x-2 mt-2 flex-wrap">
              <Badge className={getDifficultyColor(problem.difficulty)}>
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
          <div className="flex space-x-2 ml-4">
            <Button
              onClick={onPreview}
              size="sm"
              variant="outline"
              className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button
              onClick={() => setShowTestCaseForm(!showTestCaseForm)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <TestTube className="h-4 w-4 mr-2" />
              {showTestCaseForm ? 'Cancel' : 'Add Test Case'}
            </Button>
          </div>
        </div>
        {problem.description && (
          <p className="text-slate-400 text-sm mt-2 line-clamp-2">
            {problem.description}
          </p>
        )}
      </CardHeader>
      
      {showTestCaseForm && (
        <CardContent className="border-t border-slate-700 pt-4">
          <form onSubmit={handleCreateTestCase} className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-white font-medium">Add Test Case</h4>
              <Button
                type="button"
                onClick={() => setShowTestCaseForm(false)}
                size="sm"
                variant="ghost"
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Input Data *</Label>
                <Textarea
                  value={testCaseForm.input_data}
                  onChange={(e) => setTestCaseForm(prev => ({ ...prev, input_data: e.target.value }))}
                  required
                  rows={4}
                  placeholder="Enter input data"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
              <div>
                <Label className="text-slate-300">Expected Output *</Label>
                <Textarea
                  value={testCaseForm.expected_output}
                  onChange={(e) => setTestCaseForm(prev => ({ ...prev, expected_output: e.target.value }))}
                  required
                  rows={4}
                  placeholder="Enter expected output"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={testCaseForm.is_sample}
                    onChange={(e) => setTestCaseForm(prev => ({ ...prev, is_sample: e.target.checked }))}
                    className="rounded border-slate-600 bg-slate-700 text-blue-600"
                  />
                  <span>Sample Test Case</span>
                </label>
                
                <div className="flex items-center space-x-2">
                  <Label className="text-slate-300">Points:</Label>
                  <Input
                    type="number"
                    value={testCaseForm.points}
                    onChange={(e) => setTestCaseForm(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                    min="0"
                    className="bg-slate-700 border-slate-600 text-white w-20"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                size="sm" 
                disabled={createTestCase.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {createTestCase.isPending ? 'Adding...' : 'Add Test Case'}
              </Button>
            </div>
          </form>
        </CardContent>
      )}
    </Card>
  );
};

export default ProblemCard;
