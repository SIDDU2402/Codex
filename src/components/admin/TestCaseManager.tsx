
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useCreateTestCase, useTestCases } from '@/hooks/useAdmin';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TestCaseManagerProps {
  problemId: string;
}

const TestCaseManager = ({ problemId }: TestCaseManagerProps) => {
  const [showTestCaseForm, setShowTestCaseForm] = useState(false);
  const [testCaseForm, setTestCaseForm] = useState({
    input_data: '',
    expected_output: '',
    is_sample: false,
    points: 10,
  });

  const { data: testCases, isLoading } = useTestCases(problemId);
  const createTestCase = useCreateTestCase();
  const { toast } = useToast();

  const handleCreateTestCase = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!testCaseForm.input_data) {
      toast({
        title: "Validation Error",
        description: "Input data is required.",
        variant: "destructive",
      });
      return;
    }

    if (!testCaseForm.expected_output) {
      toast({
        title: "Validation Error",
        description: "Expected output is required.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await createTestCase.mutateAsync({
        problem_id: problemId,
        input_data: testCaseForm.input_data,
        expected_output: testCaseForm.expected_output,
        is_sample: testCaseForm.is_sample,
        points: testCaseForm.points,
      });
      
      // Reset form on success
      setTestCaseForm({
        input_data: '',
        expected_output: '',
        is_sample: false,
        points: 10,
      });
      setShowTestCaseForm(false);
    } catch (error) {
      console.error('Test case creation failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center text-slate-300">Loading test cases...</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-white">Test Cases</h4>
          <p className="text-slate-400 text-sm">
            {testCases?.length || 0} test case{(testCases?.length || 0) !== 1 ? 's' : ''} created
          </p>
        </div>
        <Button
          onClick={() => setShowTestCaseForm(!showTestCaseForm)}
          className="bg-purple-600 hover:bg-purple-700"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          {showTestCaseForm ? 'Cancel' : 'Add Test Case'}
        </Button>
      </div>

      {showTestCaseForm && (
        <Card className="bg-slate-700 border-slate-600">
          <CardHeader>
            <CardTitle className="text-white text-lg">Create Test Case</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTestCase} className="space-y-4">
              <div>
                <Label className="text-slate-300">Input Data *</Label>
                <Textarea
                  value={testCaseForm.input_data}
                  onChange={(e) => setTestCaseForm(prev => ({ ...prev, input_data: e.target.value }))}
                  required
                  rows={3}
                  placeholder="Enter input data for this test case"
                  className="bg-slate-600 border-slate-500 text-white placeholder:text-slate-400"
                />
              </div>

              <div>
                <Label className="text-slate-300">Expected Output *</Label>
                <Textarea
                  value={testCaseForm.expected_output}
                  onChange={(e) => setTestCaseForm(prev => ({ ...prev, expected_output: e.target.value }))}
                  required
                  rows={3}
                  placeholder="Enter expected output for this test case"
                  className="bg-slate-600 border-slate-500 text-white placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Points</Label>
                  <Input
                    type="number"
                    value={testCaseForm.points}
                    onChange={(e) => setTestCaseForm(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                    min="0"
                    className="bg-slate-600 border-slate-500 text-white"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_sample"
                    checked={testCaseForm.is_sample}
                    onCheckedChange={(checked) => setTestCaseForm(prev => ({ ...prev, is_sample: checked }))}
                  />
                  <Label htmlFor="is_sample" className="text-slate-300">Sample Test Case</Label>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button 
                  type="submit" 
                  disabled={createTestCase.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {createTestCase.isPending ? 'Creating...' : 'Create Test Case'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowTestCaseForm(false)}
                  className="border-slate-500 text-slate-300 hover:text-white hover:bg-slate-600"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {testCases && testCases.length > 0 ? (
          testCases.map((testCase, index) => (
            <Card key={testCase.id} className="bg-slate-700 border-slate-600">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <h5 className="text-white font-medium">Test Case {index + 1}</h5>
                    {testCase.is_sample && (
                      <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">Sample</span>
                    )}
                    <span className="text-slate-400 text-sm">{testCase.points} points</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300 text-sm">Input:</Label>
                    <div className="bg-slate-800 p-2 rounded text-white text-sm font-mono max-h-20 overflow-y-auto">
                      {testCase.input_data}
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-300 text-sm">Expected Output:</Label>
                    <div className="bg-slate-800 p-2 rounded text-white text-sm font-mono max-h-20 overflow-y-auto">
                      {testCase.expected_output}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="bg-slate-700 border-slate-600">
            <CardContent className="p-6 text-center">
              <div className="text-slate-400">
                <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No test cases created yet</p>
                <p className="text-sm">Click "Add Test Case" to create your first test case</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TestCaseManager;
