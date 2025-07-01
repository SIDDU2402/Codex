import { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Send, Clock, CheckCircle, XCircle, Loader, AlertCircle, Code } from 'lucide-react';
import { useSubmitCode } from '@/hooks/useContests';
import { useEvaluateSubmission } from '@/hooks/useEvaluation';
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface MonacoCodeEditorProps {
  problemId?: string;
  contestId?: string;
  onSubmit?: () => void;
  testCases?: Array<{
    id: string;
    input_data: string;
    expected_output: string;
    is_sample: boolean;
    points: number;
  }>;
}

const MonacoCodeEditor = ({ problemId, contestId, onSubmit, testCases }: MonacoCodeEditorProps) => {
  const editorRef = useRef<any>(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [executionOutput, setExecutionOutput] = useState<{
    output: string;
    error?: string;
    compilation_error?: string;
    execution_time: number;
    status: 'success' | 'error' | 'timeout';
  } | null>(null);
  const [testResults, setTestResults] = useState<Array<{
    passed: boolean;
    input: string;
    expected: string;
    actual: string;
    error?: string;
    compilation_error?: string;
    execution_time?: number;
  }>>([]);

  const submitCode = useSubmitCode();
  const evaluateSubmission = useEvaluateSubmission();

  const languages = [
    { value: 'python', label: 'Python 3', monaco: 'python', ext: '.py' },
    { value: 'java', label: 'Java', monaco: 'java', ext: '.java' },
    { value: 'cpp', label: 'C++', monaco: 'cpp', ext: '.cpp' },
    { value: 'c', label: 'C', monaco: 'c', ext: '.c' },
    { value: 'javascript', label: 'JavaScript', monaco: 'javascript', ext: '.js' },
  ];

  function getDefaultCode(lang: string): string {
    const templates = {
      python: `# Read input
n = int(input())
# Your solution here
print(n)`,
      java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        // Your solution here
        System.out.println(n);
        sc.close();
    }
}`,
      cpp: `#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    // Your solution here
    cout << n << endl;
    return 0;
}`,
      c: `#include <stdio.h>

int main() {
    int n;
    scanf("%d", &n);
    // Your solution here
    printf("%d\\n", n);
    return 0;
}`,
      javascript: `const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.on('line', (input) => {
    const n = parseInt(input);
    // Your solution here
    console.log(n);
    rl.close();
});`
    };
    return templates[lang as keyof typeof templates] || templates.python;
  }

  useEffect(() => {
    setCode(getDefaultCode(language));
  }, [language]);

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    setExecutionOutput(null);
    setTestResults([]);
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    monaco.editor.defineTheme('examTheme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955' },
        { token: 'keyword', foreground: '569CD6' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
      ],
      colors: {
        'editor.background': '#0f172a',
        'editor.foreground': '#e2e8f0',
        'editor.lineHighlightBackground': '#1e293b',
        'editorLineNumber.foreground': '#64748b',
      }
    });
    monaco.editor.setTheme('examTheme');

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleRun();
    });
    
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
      handleSubmit();
    });
  };

  // Enhanced custom execution with better error handling
  const handleCustomRun = async () => {
    if (!code.trim()) {
      toast.error('Please write some code before running');
      return;
    }

    setIsRunning(true);
    setExecutionOutput(null);

    try {
      const startTime = Date.now();
      
      const { data, error } = await supabase.functions.invoke('judge0-execute', {
        body: {
          code,
          language,
          testCases: [{
            id: 'custom',
            input_data: customInput,
            expected_output: '',
            is_sample: false,
            points: 0
          }]
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Execution failed: ${error.message || 'Unknown error'}`);
      }

      if (!data) {
        throw new Error('No response from execution service');
      }

      console.log('Custom run response:', data);

      if (!data.testResults || !Array.isArray(data.testResults) || data.testResults.length === 0) {
        throw new Error('Invalid response: no test results received');
      }

      const result = data.testResults[0];
      
      // Handle different execution outcomes
      let status: 'success' | 'error' | 'timeout' = 'success';
      let errorMessage = '';

      if (result.compilation_error) {
        status = 'error';
        errorMessage = result.compilation_error;
      } else if (result.error) {
        status = 'error';
        errorMessage = result.error;
      } else if (result.timeout) {
        status = 'timeout';
        errorMessage = 'Time limit exceeded';
      }

      const executionTime = Date.now() - startTime;
      
      setExecutionOutput({
        output: result.actual || '',
        error: result.error,
        compilation_error: result.compilation_error,
        execution_time: result.execution_time || executionTime,
        status
      });

      // Show appropriate toast messages
      if (result.compilation_error) {
        toast.error('Compilation Error - Check your syntax');
      } else if (result.error) {
        toast.error('Runtime Error - Check your logic');
      } else if (result.timeout) {
        toast.error('Time Limit Exceeded - Optimize your solution');
      } else {
        toast.success('Code executed successfully');
      }

    } catch (error) {
      console.error('Custom execution error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to execute code. Please try again.';
      
      setExecutionOutput({
        output: '',
        error: errorMsg,
        execution_time: 0,
        status: 'error'
      });
      
      toast.error('Execution failed: ' + errorMsg);
    } finally {
      setIsRunning(false);
    }
  };

  // Enhanced sample test case execution
  const handleRun = async () => {
    if (!testCases || testCases.length === 0) {
      toast.error('No test cases available for this problem');
      return;
    }

    if (!code.trim()) {
      toast.error('Please write some code before running');
      return;
    }

    setIsRunning(true);
    setTestResults([]);
    setExecutionOutput(null);

    try {
      const sampleTestCases = testCases.filter(tc => tc.is_sample);
      
      if (sampleTestCases.length === 0) {
        toast.error('No sample test cases available for testing');
        setIsRunning(false);
        return;
      }

      console.log('Running sample tests:', sampleTestCases.length);

      const { data, error } = await supabase.functions.invoke('judge0-execute', {
        body: {
          code,
          language,
          testCases: sampleTestCases
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Execution failed: ${error.message || 'Unknown error'}`);
      }

      if (!data) {
        throw new Error('No response from execution service');
      }

      console.log('Sample test response:', data);

      if (!data.testResults || !Array.isArray(data.testResults)) {
        throw new Error('Invalid response: no test results received');
      }

      // Process and display results
      const processedResults = data.testResults.map((result: any, index: number) => ({
        passed: result.passed || false,
        input: sampleTestCases[index]?.input_data || '',
        expected: sampleTestCases[index]?.expected_output || '',
        actual: result.actual || '',
        error: result.error,
        compilation_error: result.compilation_error,
        execution_time: result.execution_time || 0
      }));

      setTestResults(processedResults);

      const passedCount = processedResults.filter(r => r.passed).length;
      const totalCount = processedResults.length;
      
      // Show detailed feedback
      if (data.compilation_error) {
        toast.error('Compilation Error - Fix syntax errors before running');
      } else if (passedCount === totalCount) {
        toast.success(`Perfect! All ${passedCount} sample test cases passed!`);
      } else if (passedCount > 0) {
        toast.info(`${passedCount}/${totalCount} sample test cases passed - Review failed cases`);
      } else {
        toast.error(`0/${totalCount} sample test cases passed - Check your logic`);
      }

    } catch (error) {
      console.error('Run sample tests error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to run tests. Please try again.';
      toast.error('Execution failed: ' + errorMsg);
    } finally {
      setIsRunning(false);
    }
  };

  // Enhanced submission with better feedback
  const handleSubmit = async () => {
    if (!problemId || !contestId) {
      toast.error("Problem ID and Contest ID are required for submission");
      return;
    }

    if (!code.trim()) {
      toast.error("Please write some code before submitting");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Submitting code for evaluation...');
      
      const submission = await submitCode.mutateAsync({
        problemId,
        contestId,
        code,
        language,
      });
      
      if (!submission?.id) {
        throw new Error('Failed to create submission - no submission ID received');
      }

      console.log('Submission created, starting evaluation:', submission.id);
      
      const evaluationResult = await evaluateSubmission.mutateAsync(submission.id);
      
      console.log('Evaluation result:', evaluationResult);
      
      if (evaluationResult?.success) {
        const passedCount = evaluationResult.passedTestCases || 0;
        const totalCount = evaluationResult.totalTestCases || 0;
        const score = evaluationResult.score || 0;
        
        // Provide detailed feedback based on results
        if (evaluationResult.hasCompilationError) {
          toast.error('Compilation Error - Please fix syntax errors');
        } else if (passedCount === totalCount) {
          toast.success(`🎉 Perfect! All ${totalCount} test cases passed! Score: ${score} points`);
        } else if (passedCount > 0) {
          toast.info(`${passedCount}/${totalCount} test cases passed. Score: ${score} points`);
        } else {
          toast.error(`Solution failed all test cases. Score: ${score} points`);
        }
        
        // Additional status-specific messages
        switch (evaluationResult.status) {
          case 'accepted':
            toast.success('🏆 Solution Accepted!');
            break;
          case 'partial_correct':
            toast.info('Partial solution - Some test cases failed');
            break;
          case 'compilation_error':
            toast.error('Compilation error - Check your syntax');
            break;
          case 'wrong_answer':
            toast.error('Wrong answer - Review your logic');
            break;
        }
      } else {
        throw new Error('Evaluation failed: ' + (evaluationResult?.error || 'Unknown error'));
      }
      
      onSubmit?.();
    } catch (error) {
      console.error("Submission failed:", error);
      const errorMsg = error instanceof Error ? error.message : "Failed to submit code. Please try again.";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentLanguage = languages.find(lang => lang.value === language);

  return (
    <div className="h-full bg-slate-800 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-white flex items-center">
              <Code className="h-5 w-5 mr-2" />
              Code Editor
            </h2>
            <Badge variant="outline" className="border-slate-600 text-slate-300">
              {currentLanguage?.label}
            </Badge>
            <Badge variant="outline" className="border-green-600 text-green-400">
              Judge0 Powered
            </Badge>
          </div>
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {languages.map((lang) => (
                <SelectItem key={lang.value} value={lang.value} className="text-white hover:bg-slate-600">
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setShowCustomInput(!showCustomInput)}
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:text-white"
            >
              Custom Input
            </Button>
            <Button
              onClick={handleRun}
              disabled={isRunning || !testCases || testCases.length === 0}
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:text-white"
            >
              {isRunning ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Sample Tests
                </>
              )}
            </Button>
          </div>
          
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !problemId || !contestId}
            className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600"
          >
            {isSubmitting ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Evaluating...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Solution
              </>
            )}
          </Button>
        </div>

        {/* Keyboard shortcuts info */}
        <div className="mt-2 text-xs text-slate-400">
          Shortcuts: Ctrl+Enter (Run) • Ctrl+Shift+Enter (Submit) • Powered by Judge0 API
        </div>
      </div>

      {/* Custom Input Panel */}
      {showCustomInput && (
        <div className="border-b border-slate-700 p-4 bg-slate-900">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Custom Input:</label>
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Enter your test input here..."
              className="w-full h-20 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm font-mono resize-none"
            />
            <Button
              onClick={handleCustomRun}
              disabled={isRunning}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isRunning ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run with Custom Input
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={currentLanguage?.monaco || 'python'}
          value={code}
          onChange={(value) => setCode(value || '')}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: language === 'python' ? 4 : 2,
            wordWrap: 'on',
            folding: true,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 3,
            renderLineHighlight: 'line',
            selectOnLineNumbers: true,
            cursorStyle: 'line',
            smoothScrolling: true,
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true },
          }}
        />
      </div>

      {/* Enhanced Output Panel */}
      {(executionOutput || testResults.length > 0) && (
        <div className="border-t border-slate-700 max-h-80 overflow-y-auto bg-slate-900">
          {/* Custom execution output */}
          {executionOutput && (
            <div className="p-4">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-sm flex items-center">
                    <div className="flex items-center">
                      {executionOutput.status === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      ) : executionOutput.status === 'timeout' ? (
                        <Clock className="h-4 w-4 text-yellow-500 mr-2" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                      )}
                      Custom Execution Result
                    </div>
                    <Badge className="ml-2 text-xs">
                      {executionOutput.execution_time}ms
                    </Badge>
                    <Badge variant="outline" className="ml-2 text-xs border-green-600 text-green-400">
                      Judge0
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {executionOutput.compilation_error && (
                    <div>
                      <span className="text-red-400 text-sm font-medium">Compilation Error:</span>
                      <pre className="text-red-400 bg-red-900/20 p-2 rounded mt-1 text-xs font-mono whitespace-pre-wrap">
                        {executionOutput.compilation_error}
                      </pre>
                    </div>
                  )}
                  {executionOutput.error && !executionOutput.compilation_error && (
                    <div>
                      <span className="text-red-400 text-sm font-medium">Runtime Error:</span>
                      <pre className="text-red-400 bg-red-900/20 p-2 rounded mt-1 text-xs font-mono whitespace-pre-wrap">
                        {executionOutput.error}
                      </pre>
                    </div>
                  )}
                  {!executionOutput.compilation_error && !executionOutput.error && (
                    <div>
                      <span className="text-green-400 text-sm font-medium">Output:</span>
                      <pre className="text-green-400 bg-green-900/20 p-2 rounded mt-1 text-xs font-mono whitespace-pre-wrap">
                        {executionOutput.output || '(no output)'}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Sample test results */}
          {testResults.length > 0 && (
            <div className="p-4">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-sm flex items-center">
                    Sample Test Results
                    <Badge className={`ml-2 ${testResults.every(r => r.passed) ? 'bg-green-600' : 'bg-red-600'} text-white text-xs`}>
                      {testResults.filter(r => r.passed).length}/{testResults.length} Passed
                    </Badge>
                    <Badge variant="outline" className="ml-2 text-xs border-green-600 text-green-400">
                      Judge0
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {testResults.map((result, index) => (
                    <div key={index} className="bg-slate-700 p-3 rounded-lg">
                      <div className="flex items-center mb-2">
                        {result.passed ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 mr-2" />
                        )}
                        <span className="text-white text-sm font-medium">
                          Sample Test Case {index + 1}
                        </span>
                        {result.execution_time && (
                          <Badge className="ml-2 text-xs">
                            {result.execution_time}ms
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-slate-400">Input: </span>
                          <span className="text-slate-300 font-mono">{result.input}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Expected: </span>
                          <span className="text-slate-300 font-mono">{result.expected}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Your Output: </span>
                          <span className={`font-mono ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
                            {result.actual || 'No output'}
                          </span>
                        </div>
                        {result.compilation_error && (
                          <div>
                            <span className="text-slate-400">Compilation Error: </span>
                            <span className="text-red-400 font-mono text-xs">{result.compilation_error}</span>
                          </div>
                        )}
                        {result.error && (
                          <div>
                            <span className="text-slate-400">Runtime Error: </span>
                            <span className="text-red-400 font-mono text-xs">{result.error}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MonacoCodeEditor;
