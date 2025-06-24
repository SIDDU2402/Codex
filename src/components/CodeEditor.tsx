
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Play, Square, CheckCircle, XCircle } from "lucide-react";

interface TestCase {
  id: number;
  input: string;
  expectedOutput: string;
  actualOutput?: string;
  status?: 'passed' | 'failed' | 'pending';
}

const CodeEditor = () => {
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [code, setCode] = useState(getDefaultCode('javascript'));
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestCase[]>([
    { id: 1, input: 'nums = [2,7,11,15], target = 9', expectedOutput: '[0,1]' },
    { id: 2, input: 'nums = [3,2,4], target = 6', expectedOutput: '[1,2]' },
    { id: 3, input: 'nums = [3,3], target = 6', expectedOutput: '[0,1]' },
  ]);

  function getDefaultCode(language: string): string {
    const templates = {
      javascript: `function twoSum(nums, target) {
    // Your code here
    
}`,
      python: `def two_sum(nums, target):
    # Your code here
    pass`,
      java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Your code here
        
    }
}`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Your code here
        
    }
};`
    };
    return templates[language as keyof typeof templates] || templates.javascript;
  }

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    setCode(getDefaultCode(language));
  };

  const runCode = async () => {
    setIsRunning(true);
    
    // Simulate test execution
    setTimeout(() => {
      const updatedResults = testResults.map((test, index) => ({
        ...test,
        actualOutput: index === 0 ? '[0,1]' : index === 1 ? '[1,2]' : '[0,1]',
        status: (index === 0 ? 'passed' : index === 1 ? 'passed' : 'passed') as 'passed' | 'failed'
      }));
      
      setTestResults(updatedResults);
      setIsRunning(false);
    }, 2000);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Language Selector */}
      <div className="border-b border-slate-700 p-4 bg-slate-800">
        <div className="flex items-center justify-between">
          <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="java">Java</SelectItem>
              <SelectItem value="cpp">C++</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-sm text-slate-400">
            Font Size: <button className="hover:text-white">14px</button>
          </div>
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex-1 p-4">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full h-full bg-slate-800 text-white font-mono text-sm p-4 border border-slate-700 rounded resize-none focus:outline-none focus:border-cyan-500 transition-colors"
          placeholder="// Write your solution here..."
          style={{ 
            lineHeight: '1.6',
            tabSize: 4,
          }}
        />
      </div>

      {/* Control Panel */}
      <div className="border-t border-slate-700 p-4 bg-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex space-x-2">
            <Button 
              onClick={runCode}
              disabled={isRunning}
              variant="outline" 
              className="border-slate-600 text-slate-300 hover:text-white hover:border-cyan-500"
            >
              {isRunning ? (
                <Square className="h-4 w-4 mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isRunning ? 'Running...' : 'Run Code'}
            </Button>
            <Button className="bg-green-600 hover:bg-green-700">
              Submit Solution
            </Button>
          </div>
          <div className="text-sm text-slate-400">
            Test Cases: <span className="text-cyan-400">
              {testResults.filter(t => t.status === 'passed').length}/{testResults.length} Passed
            </span>
          </div>
        </div>

        {/* Test Results */}
        {testResults.some(t => t.status) && (
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white">Test Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {testResults.map((test) => (
                <div key={test.id} className="flex items-center justify-between p-2 bg-slate-800 rounded text-sm">
                  <div className="flex items-center space-x-2">
                    {test.status === 'passed' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : test.status === 'failed' ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-slate-500" />
                    )}
                    <span className="text-slate-300">Test Case {test.id}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={test.status === 'passed' ? 'default' : 'destructive'}
                      className={test.status === 'passed' ? 'bg-green-600' : ''}
                    >
                      {test.status?.toUpperCase() || 'PENDING'}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CodeEditor;
