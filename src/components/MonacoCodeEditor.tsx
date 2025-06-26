
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
  const [code, setCode] = useState(getDefaultCode('javascript'));
  const [language, setLanguage] = useState('javascript');
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<Array<{
    passed: boolean;
    input: string;
    expected: string;
    actual: string;
    error?: string;
  }>>([]);
  const [lastSubmissionId, setLastSubmissionId] = useState<string | null>(null);

  const submitCode = useSubmitCode();
  const evaluateSubmission = useEvaluateSubmission();

  const languages = [
    { value: 'javascript', label: 'JavaScript', monaco: 'javascript' },
    { value: 'python', label: 'Python', monaco: 'python' },
    { value: 'java', label: 'Java', monaco: 'java' },
    { value: 'cpp', label: 'C++', monaco: 'cpp' },
    { value: 'c', label: 'C', monaco: 'c' },
  ];

  function getDefaultCode(lang: string): string {
    const templates = {
      javascript: `function solution() {
    // Write your solution here
    return "";
}`,
      python: `def solution():
    # Write your solution here
    return ""`,
      java: `public class Solution {
    public String solution() {
        // Write your solution here
        return "";
    }
}`,
      cpp: `#include <iostream>
#include <string>
using namespace std;

string solution() {
    // Write your solution here
    return "";
}`,
      c: `#include <stdio.h>
#include <string.h>

char* solution() {
    // Write your solution here
    return "";
}`
    };
    return templates[lang as keyof typeof templates] || templates.javascript;
  }

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    setCode(getDefaultCode(newLanguage));
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    // Configure Monaco themes
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

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleRun();
    });
  };

  const executeCode = async (codeToRun: string, lang: string, input: string): Promise<{ output: string; error?: string }> => {
    try {
      switch (lang) {
        case 'javascript':
          return await executeJavaScript(codeToRun, input);
        case 'python':
          return await executePython(codeToRun, input);
        default:
          return { output: '', error: `Language ${lang} not yet supported in preview` };
      }
    } catch (error) {
      return { output: '', error: error instanceof Error ? error.message : 'Execution error' };
    }
  };

  const executeJavaScript = async (code: string, input: string): Promise<{ output: string; error?: string }> => {
    try {
      const wrappedCode = `
        const input = ${JSON.stringify(input)};
        const inputLines = input.trim().split('\\n');
        let currentLine = 0;
        
        function readline() {
          return currentLine < inputLines.length ? inputLines[currentLine++] : '';
        }
        
        let output = '';
        const originalConsoleLog = console.log;
        console.log = (...args) => {
          output += args.join(' ') + '\\n';
        };
        
        try {
          ${code}
          
          if (typeof solution === 'function') {
            const result = solution();
            if (result !== undefined) {
              console.log(result);
            }
          }
          
          return output.trim();
        } catch (error) {
          throw new Error('Runtime Error: ' + error.message);
        }
      `;
      
      const result = new Function(wrappedCode)();
      return { output: result || '' };
    } catch (error) {
      return { output: '', error: error instanceof Error ? error.message : 'Execution error' };
    }
  };

  const executePython = async (code: string, input: string): Promise<{ output: string; error?: string }> => {
    // For now, return a placeholder since we need a Python runtime
    return { output: 'Python execution not available in preview mode', error: 'Not implemented' };
  };

  const handleRun = async () => {
    if (!testCases || testCases.length === 0) {
      setTestResults([{ passed: false, input: '', expected: '', actual: '', error: 'No test cases available' }]);
      return;
    }

    setIsRunning(true);
    setTestResults([]);

    const results = [];
    const sampleTestCases = testCases.filter(tc => tc.is_sample);
    const casesToTest = sampleTestCases.length > 0 ? sampleTestCases : testCases.slice(0, 3);

    for (const testCase of casesToTest) {
      const result = await executeCode(code, language, testCase.input_data);
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
  };

  const handleSubmit = async () => {
    if (!problemId || !contestId) {
      console.error("Problem ID and Contest ID are required for submission");
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
        setLastSubmissionId(submission.id);
        // Trigger evaluation
        await evaluateSubmission.mutateAsync(submission.id);
      }
      
      onSubmit?.();
    } catch (error) {
      console.error("Submission failed:", error);
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
              disabled={isRunning}
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
      </div>

      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={currentLanguage?.monaco || 'javascript'}
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
            tabSize: 2,
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
                Test Results
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
                      <span className="text-slate-300">{result.input}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Expected: </span>
                      <span className="text-slate-300">{result.expected}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Your Output: </span>
                      <span className={result.passed ? 'text-green-400' : 'text-red-400'}>
                        {result.actual || 'No output'}
                      </span>
                    </div>
                    {result.error && (
                      <div>
                        <span className="text-slate-400">Error: </span>
                        <span className="text-red-400">{result.error}</span>
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
