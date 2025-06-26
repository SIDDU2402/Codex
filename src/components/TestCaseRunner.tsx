
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Play, Clock } from 'lucide-react';
import { toast } from 'sonner';

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

  const executePython = async (code: string, input: string): Promise<{ output: string; error?: string }> => {
    try {
      // For local preview, provide basic simulation for Python
      const lines = input.trim().split('\n');
      
      // Simple pattern matching for basic operations
      if (code.includes('input().strip()') && code.includes('print(')) {
        // Basic echo for demonstration
        return { output: lines[0] || '', error: 'Note: This is a simulated result. Server-side execution will be more accurate.' };
      }
      
      if (code.includes('def solution():') && code.includes('return')) {
        // Try to extract simple return values
        return { output: lines[0] || '', error: 'Note: Complex Python logic requires server-side execution for accurate results.' };
      }
      
      return { output: 'Python execution requires server-side processing', error: 'Submit your code for full Python execution' };
    } catch (error) {
      return { output: '', error: error instanceof Error ? error.message : 'Python execution error' };
    }
  };

  const executeJava = async (code: string, input: string): Promise<{ output: string; error?: string }> => {
    try {
      // For local preview, provide basic simulation for Java
      const lines = input.trim().split('\n');
      
      // Simple pattern matching for basic operations
      if (code.includes('scanner.nextLine()') && code.includes('System.out.println')) {
        // Basic echo for demonstration
        return { output: lines[0] || '', error: 'Note: This is a simulated result. Server-side execution will be more accurate.' };
      }
      
      if (code.includes('public String solve(') && code.includes('return')) {
        // Try to extract simple return values
        return { output: lines[0] || '', error: 'Note: Complex Java logic requires server-side execution for accurate results.' };
      }
      
      return { output: 'Java execution requires server-side compilation', error: 'Submit your code for full Java execution' };
    } catch (error) {
      return { output: '', error: error instanceof Error ? error.message : 'Java execution error' };
    }
  };

  const executeJavaScript = async (code: string, input: string): Promise<{ output: string; error?: string }> => {
    try {
      const wrappedCode = `
        const inputData = ${JSON.stringify(input)};
        const inputLines = inputData.trim().split('\\n');
        let currentLineIndex = 0;
        
        function readline() {
          if (currentLineIndex < inputLines.length) {
            return inputLines[currentLineIndex++];
          }
          return '';
        }
        
        let output = '';
        const originalConsoleLog = console.log;
        console.log = (...args) => {
          output += args.join(' ') + '\\n';
        };
        
        try {
          ${code}
          console.log = originalConsoleLog;
          return output.trim();
        } catch (error) {
          console.log = originalConsoleLog;
          throw new Error('Runtime Error: ' + error.message);
        }
      `;
      
      const func = new Function(wrappedCode);
      const result = func();
      return { output: result || '' };
    } catch (error) {
      return { output: '', error: error instanceof Error ? error.message : 'Execution error' };
    }
  };

  const executeTestCase = async (testCase: TestCase) => {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (language.toLowerCase()) {
        case 'python':
          result = await executePython(code, testCase.input_data);
          break;
        case 'java':
          result = await executeJava(code, testCase.input_data);
          break;
        case 'javascript':
          result = await executeJavaScript(code, testCase.input_data);
          break;
        default:
          result = { output: '', error: `${language} execution not supported in preview mode` };
      }
      
      const executionTime = Date.now() - startTime;
      
      return {
        testCaseId: testCase.id,
        passed: result.output.trim() === testCase.expected_output.trim() && !result.error,
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

  const runAllTests = async () => {
    if (!code.trim()) {
      toast.error("Please write some code before running tests");
      return;
    }

    setIsRunning(true);
    const testResults = [];
    
    for (const testCase of testCases) {
      const result = await executeTestCase(testCase);
      testResults.push(result);
    }
    
    setResults(testResults);
    setIsRunning(false);
    onRunComplete?.(testResults);

    const passedCount = testResults.filter(r => r.passed).length;
    if (passedCount === testResults.length) {
      toast.success(`All ${passedCount} test cases passed!`);
    } else {
      if (language === 'python' || language === 'java') {
        toast.info(`Preview: ${passedCount}/${testResults.length} test cases passed. Submit for accurate ${language} evaluation.`);
      } else {
        toast.error(`${passedCount}/${testResults.length} test cases passed`);
      }
    }
  };

  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center">
            Test Cases
            {(language === 'python' || language === 'java') && (
              <Badge className="ml-2 bg-blue-600 text-white text-xs">
                Preview Mode
              </Badge>
            )}
            {results.length > 0 && (
              <Badge className={`ml-2 ${passedTests === totalTests ? 'bg-green-600' : 'bg-red-600'}`}>
                {passedTests}/{totalTests} Passed
              </Badge>
            )}
          </CardTitle>
          <Button
            onClick={runAllTests}
            disabled={isRunning || testCases.length === 0 || !code.trim()}
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
        {(language === 'python' || language === 'java') && (
          <div className="mt-2 p-2 bg-blue-900/20 border border-blue-700 rounded">
            <p className="text-blue-300 text-sm">
              <strong>Preview Mode:</strong> {language === 'python' ? 'Python' : 'Java'} code will be fully executed on the server when submitted. 
              These results are for preview only.
            </p>
          </div>
        )}
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
                  <pre className="text-slate-300 bg-slate-800 p-2 rounded mt-1 overflow-x-auto font-mono">
                    {testCase.input_data}
                  </pre>
                </div>
                
                <div>
                  <span className="text-slate-400">Expected Output:</span>
                  <pre className="text-slate-300 bg-slate-800 p-2 rounded mt-1 overflow-x-auto font-mono">
                    {testCase.expected_output}
                  </pre>
                </div>
                
                {result && (
                  <>
                    <div>
                      <span className="text-slate-400">Your Output:</span>
                      <pre className={`p-2 rounded mt-1 overflow-x-auto font-mono ${
                        result.passed ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'
                      }`}>
                        {result.output || 'No output'}
                      </pre>
                    </div>
                    
                    {result.error && (
                      <div>
                        <span className="text-slate-400">
                          {result.error.includes('Note:') ? 'Info:' : 'Error:'}
                        </span>
                        <pre className={`p-2 rounded mt-1 overflow-x-auto font-mono ${
                          result.error.includes('Note:') ? 'text-blue-400 bg-blue-900/20' : 'text-red-400 bg-red-900/20'
                        }`}>
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
