
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Play, Clock } from 'lucide-react';

interface TestCase {
  id: string;
  input_data: string;
  expected_output: string;
  is_sample: boolean;
  points: number;
}

interface TestCaseRunnerProps {
  testCases: TestCase[];
  code: string;
  language: string;
  onRunComplete?: (results: any[]) => void;
}

const TestCaseRunner = ({ testCases, code, language, onRunComplete }: TestCaseRunnerProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<Array<{
    testCaseId: string;
    passed: boolean;
    output: string;
    error?: string;
    executionTime: number;
  }>>([]);

  const executeTestCase = async (testCase: TestCase) => {
    const startTime = Date.now();
    
    try {
      // Simulate code execution - in a real implementation, this would call the edge function
      const result = await executeCode(code, language, testCase.input_data);
      const executionTime = Date.now() - startTime;
      
      return {
        testCaseId: testCase.id,
        passed: result.output.trim() === testCase.expected_output.trim(),
        output: result.output,
        error: result.error,
        executionTime
      };
    } catch (error) {
      return {
        testCaseId: testCase.id,
        passed: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime
      };
    }
  };

  const executeCode = async (code: string, language: string, input: string) => {
    // This would be replaced with actual code execution logic
    // For now, return a mock result
    return {
      output: 'Mock output for testing',
      error: undefined
    };
  };

  const runAllTests = async () => {
    setIsRunning(true);
    const testResults = [];
    
    for (const testCase of testCases) {
      const result = await executeTestCase(testCase);
      testResults.push(result);
    }
    
    setResults(testResults);
    setIsRunning(false);
    onRunComplete?.(testResults);
  };

  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center">
            Test Cases
            {results.length > 0 && (
              <Badge className={`ml-2 ${passedTests === totalTests ? 'bg-green-600' : 'bg-red-600'}`}>
                {passedTests}/{totalTests} Passed
              </Badge>
            )}
          </CardTitle>
          <Button
            onClick={runAllTests}
            disabled={isRunning || testCases.length === 0}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isRunning ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Tests
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {testCases.map((testCase, index) => {
          const result = results.find(r => r.testCaseId === testCase.id);
          
          return (
            <div key={testCase.id} className="bg-slate-900 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <span className="text-white font-medium">Test Case {index + 1}</span>
                  {testCase.is_sample && (
                    <Badge variant="outline" className="ml-2 text-xs border-slate-600 text-slate-300">
                      Sample
                    </Badge>
                  )}
                  {result && (
                    <div className="ml-2">
                      {result.passed ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                <Badge variant="outline" className="text-slate-300 border-slate-600">
                  {testCase.points} pts
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-slate-400">Input:</span>
                  <pre className="text-slate-300 bg-slate-800 p-2 rounded mt-1 overflow-x-auto">
                    {testCase.input_data}
                  </pre>
                </div>
                
                <div>
                  <span className="text-slate-400">Expected Output:</span>
                  <pre className="text-slate-300 bg-slate-800 p-2 rounded mt-1 overflow-x-auto">
                    {testCase.expected_output}
                  </pre>
                </div>
                
                {result && (
                  <>
                    <div>
                      <span className="text-slate-400">Your Output:</span>
                      <pre className={`p-2 rounded mt-1 overflow-x-auto ${
                        result.passed ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'
                      }`}>
                        {result.output || 'No output'}
                      </pre>
                    </div>
                    
                    {result.error && (
                      <div>
                        <span className="text-slate-400">Error:</span>
                        <pre className="text-red-400 bg-red-900/20 p-2 rounded mt-1 overflow-x-auto">
                          {result.error}
                        </pre>
                      </div>
                    )}
                    
                    <div className="text-slate-500 text-xs">
                      Execution time: {result.executionTime}ms
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
        
        {testCases.length === 0 && (
          <div className="text-center text-slate-400 py-8">
            No test cases available for this problem
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TestCaseRunner;
