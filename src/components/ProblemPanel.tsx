
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, BookOpen, TestTube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface Problem {
  id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  constraints: string[];
  hints?: string[];
}

const ProblemPanel = () => {
  const [showHints, setShowHints] = useState(false);
  
  const problem: Problem = {
    id: 1,
    title: "Two Sum",
    difficulty: "Easy",
    description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.",
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
      },
      {
        input: "nums = [3,2,4], target = 6",
        output: "[1,2]"
      },
      {
        input: "nums = [3,3], target = 6",
        output: "[0,1]"
      }
    ],
    constraints: [
      "2 ≤ nums.length ≤ 10⁴",
      "-10⁹ ≤ nums[i] ≤ 10⁹",
      "-10⁹ ≤ target ≤ 10⁹",
      "Only one valid answer exists."
    ],
    hints: [
      "A really brute force way would be to search for all possible pairs of numbers but that would be too slow. Again, it's best to try out brute force solutions for just for completeness. It is from these brute force solutions that you can come up with optimizations.",
      "So, if we fix one of the numbers, say x, we have to scan the entire array to find the next number y which is value - x where value is the input parameter. Can we change our array somehow so that this search becomes faster?",
      "The second train of thought is, without changing the array, can we use additional space somehow? Like maybe a hash map to speed up the search?"
    ]
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-500';
      case 'Medium': return 'bg-yellow-500';
      case 'Hard': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-900">
      <div className="p-6 space-y-6">
        {/* Problem Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-white">{problem.title}</h1>
              <Badge className={`${getDifficultyColor(problem.difficulty)} text-white`}>
                {problem.difficulty}
              </Badge>
            </div>
            <div className="flex items-center space-x-2 text-sm text-slate-400">
              <BookOpen className="h-4 w-4" />
              <span>Problem {problem.id}</span>
            </div>
          </div>
        </div>

        {/* Problem Description */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <p className="text-slate-300 leading-relaxed">{problem.description}</p>
          </CardContent>
        </Card>

        {/* Examples */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
            <TestTube className="h-5 w-5 mr-2" />
            Examples
          </h2>
          <div className="space-y-4">
            {problem.examples.map((example, index) => (
              <Card key={index} className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-cyan-400">Example {index + 1}:</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-slate-900 p-4 rounded-lg font-mono text-sm">
                    <div className="text-slate-400 text-xs mb-1">Input:</div>
                    <div className="text-cyan-400">{example.input}</div>
                    <div className="text-slate-400 text-xs mb-1 mt-3">Output:</div>
                    <div className="text-green-400">{example.output}</div>
                  </div>
                  {example.explanation && (
                    <div className="text-slate-300 text-sm">
                      <span className="text-slate-400">Explanation: </span>
                      {example.explanation}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Constraints */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">Constraints</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-slate-300">
              {problem.constraints.map((constraint, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-cyan-400 mr-2">•</span>
                  <code className="bg-slate-900 px-2 py-1 rounded text-sm font-mono">
                    {constraint}
                  </code>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Hints Section */}
        {problem.hints && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-lg flex items-center">
                  <Lightbulb className="h-5 w-5 mr-2 text-yellow-400" />
                  Hints
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHints(!showHints)}
                  className="border-slate-600 text-slate-300 hover:text-white hover:border-yellow-400"
                >
                  {showHints ? 'Hide Hints' : 'Show Hints'}
                </Button>
              </div>
            </CardHeader>
            {showHints && (
              <CardContent>
                <div className="space-y-3">
                  {problem.hints.map((hint, index) => (
                    <div key={index} className="bg-slate-900 p-4 rounded-lg">
                      <div className="flex items-start">
                        <Badge variant="outline" className="mr-3 text-xs border-yellow-400 text-yellow-400">
                          Hint {index + 1}
                        </Badge>
                        <p className="text-slate-300 text-sm leading-relaxed">{hint}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProblemPanel;
