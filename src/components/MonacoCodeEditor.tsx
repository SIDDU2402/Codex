
import { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Send, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';
import { useSubmitCode } from '@/hooks/useContests';
import { useEvaluateSubmission } from '@/hooks/useEvaluation';
import { useState } from 'react';
import { toast } from 'sonner';

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
  const [testResults, setTestResults] = useState<Array<{
    passed: boolean;
    input: string;
    expected: string;
    actual: string;
    error?: string;
  }>>([]);

  const submitCode = useSubmitCode();
  const evaluateSubmission = useEvaluateSubmission();

  const languages = [
    { value: 'python', label: 'Python', monaco: 'python' },
    { value: 'java', label: 'Java', monaco: 'java' },
    { value: 'cpp', label: 'C++', monaco: 'cpp' },
    { value: 'c', label: 'C', monaco: 'c' },
    { value: 'javascript', label: 'JavaScript', monaco: 'javascript' },
  ];

  function getDefaultCode(lang: string): string {
    const templates = {
      python: `def solution():
    # Write your solution here
    # Read input using input()
    line = input().strip()
    
    # Process the input and return the result
    return line

# Example: For problems that need to read multiple lines
# line1 = input().strip()
# line2 = input().strip()
# numbers = list(map(int, input().split()))

# Call the solution function
result = solution()
if result is not None:
    print(result)`,
      java: `import java.util.*;
import java.io.*;

public class Solution {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        Solution sol = new Solution();
        
        // Read input
        String input = scanner.nextLine();
        
        // Process and output result
        String result = sol.solve(input);
        System.out.println(result);
    }
    
    public String solve(String input) {
        // Write your solution here
        // Process the input and return the result
        return input;
    }
}`,
      cpp: `#include <iostream>
#include <string>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    // Write your solution here
    string input;
    getline(cin, input);
    
    // Process the input and output the result
    cout << input << endl;
    
    return 0;
}`,
      c: `#include <stdio.h>
#include <string.h>
#include <stdlib.h>

int main() {
    // Write your solution here
    char input[1000];
    fgets(input, sizeof(input), stdin);
    
    // Remove newline character
    input[strcspn(input, "\\n")] = 0;
    
    // Process the input and output the result
    printf("%s\\n", input);
    
    return 0;
}`,
      javascript: `function solution() {
    // Write your solution here
    // Use readline() to read input
    const input = readline().trim();
    
    // Process the input and return the result
    return input;
}

// Call the solution function
const result = solution();
if (result !== undefined && result !== null) {
    console.log(result);
}`
    };
    return templates[lang as keyof typeof templates] || templates.python;
  }

  useEffect(() => {
    setCode(getDefaultCode(language));
  }, [language]);

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    monaco.editor.defineTheme('darkTheme', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#0f172a',
        'editor.foreground': '#e2e8f0',
      }
    });
    monaco.editor.setTheme('darkTheme');

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleRun();
    });
  };

  const executePython = async (code: string, input: string): Promise<{ output: string; error?: string }> => {
    try {
      // Simulate Python execution - in a real environment, this would use a Python interpreter
      // For demo purposes, we'll do basic string processing
      const lines = input.trim().split('\n');
      
      // Simple pattern matching for common operations
      if (code.includes('input().strip()') && code.includes('return')) {
        // Basic echo functionality for demonstration
        return { output: lines[0] || '' };
      }
      
      // For more complex operations, we'd need actual Python execution
      return { output: 'Python execution requires server-side processing', error: 'Local execution not available for Python' };
    } catch (error) {
      return { output: '', error: error instanceof Error ? error.message : 'Python execution error' };
    }
  };

  const executeJava = async (code: string, input: string): Promise<{ output: string; error?: string }> => {
    try {
      // Simulate Java execution - in a real environment, this would compile and run Java code
      const lines = input.trim().split('\n');
      
      // Basic pattern matching for simple operations
      if (code.includes('scanner.nextLine()') && code.includes('System.out.println')) {
        // Basic echo functionality for demonstration
        return { output: lines[0] || '' };
      }
      
      return { output: 'Java execution requires server-side compilation', error: 'Local execution not available for Java' };
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

  const handleRun = async () => {
    if (!testCases || testCases.length === 0) {
      toast.error('No test cases available for this problem');
      return;
    }

    setIsRunning(true);
    setTestResults([]);

    const results = [];
    const sampleTestCases = testCases.filter(tc => tc.is_sample);
    const casesToTest = sampleTestCases.length > 0 ? sampleTestCases : testCases.slice(0, 3);

    for (const testCase of casesToTest) {
      let result;
      
      switch (language) {
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
      
      const passed = result.output.trim() === testCase.expected_output.trim() && !result.error;
      
      results.push({
        passed,
        input: testCase.input_data,
        expected: testCase.expected_output,
        actual: result.output,
        error: result.error
      });
    }

    setTestResults(results);
    setIsRunning(false);

    const passedCount = results.filter(r => r.passed).length;
    if (passedCount === results.length) {
      toast.success(`All ${passedCount} test cases passed!`);
    } else {
      toast.error(`${passedCount}/${results.length} test cases passed`);
    }
  };

  const handleSubmit = async () => {
    if (!problemId || !contestId) {
      toast.error("Problem ID and Contest ID are required for submission");
      return;
    }

    if (!code.trim()) {
      toast.error("Please write some code before submitting");
      return;
    }

    try {
      const submission = await submitCode.mutateAsync({
        problemId,
        contestId,
        code,
        language,
      });
      
      if (submission?.id) {
        await evaluateSubmission.mutateAsync(submission.id);
        toast.success("Code submitted and evaluation started!");
      }
      
      onSubmit?.();
    } catch (error) {
      console.error("Submission failed:", error);
      toast.error("Failed to submit code. Please try again.");
    }
  };

  const currentLanguage = languages.find(lang => lang.value === language);

  return (
    <div className="h-full bg-slate-800 flex flex-col">
      <div className="border-b border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Code Editor</h2>
          <div className="flex items-center space-x-4">
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white">
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
            <Button
              onClick={handleRun}
              disabled={isRunning || !testCases || testCases.length === 0}
              variant="outline"
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
                  Run
                </>
              )}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitCode.isPending || !problemId || !contestId}
              className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600"
            >
              {submitCode.isPending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit
                </>
              )}
            </Button>
          </div>
        </div>
        {(language === 'python' || language === 'java') && (
          <div className="mt-2 p-2 bg-blue-900/20 border border-blue-700 rounded">
            <p className="text-blue-300 text-sm">
              <strong>Note:</strong> {language === 'python' ? 'Python' : 'Java'} code will be executed on the server when you submit. 
              Local testing shows simulated results for preview purposes.
            </p>
          </div>
        )}
      </div>

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
          }}
        />
      </div>

      {testResults.length > 0 && (
        <div className="border-t border-slate-700 p-4 max-h-64 overflow-y-auto">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center">
                Test Results (Preview Mode)
                <Badge className={`ml-2 ${testResults.every(r => r.passed) ? 'bg-green-600' : 'bg-red-600'} text-white text-xs`}>
                  {testResults.filter(r => r.passed).length}/{testResults.length} Passed
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {testResults.map((result, index) => (
                <div key={index} className="bg-slate-800 p-3 rounded-lg">
                  <div className="flex items-center mb-2">
                    {result.passed ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 mr-2" />
                    )}
                    <span className="text-white text-sm font-medium">
                      Test Case {index + 1}
                    </span>
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
                    {result.error && (
                      <div>
                        <span className="text-slate-400">Error: </span>
                        <span className="text-red-400 font-mono">{result.error}</span>
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
  );
};

export default MonacoCodeEditor;
