import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Play, Send, Clock } from "lucide-react";
import { useSubmitCode } from "@/hooks/useContests";
import { supabase } from "@/integrations/supabase/client";

interface CodeEditorProps {
  problemId?: string;
  contestId?: string;
  onSubmit?: () => void;
}

const CodeEditor = ({ problemId, contestId, onSubmit }: CodeEditorProps) => {
  const [code, setCode] = useState(`function solution() {
    // Write your solution here
    return "";
}`);
  const [language, setLanguage] = useState("javascript");
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState("");
  
  const submitCode = useSubmitCode();

  const languages = [
    { value: "javascript", label: "JavaScript" },
    { value: "python", label: "Python" },
    { value: "java", label: "Java" },
    { value: "cpp", label: "C++" },
    { value: "c", label: "C" },
  ];

  const handleRun = async () => {
    setIsRunning(true);
    // Simulate code execution
    setTimeout(() => {
      setOutput("Code executed successfully!\nSample output: Hello World");
      setIsRunning(false);
    }, 2000);
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
      
      // Trigger automatic evaluation
      if (submission?.id) {
        // Call the evaluation edge function
        const { data, error } = await supabase.functions.invoke('evaluate-submission', {
          body: { submissionId: submission.id }
        });
        
        if (error) {
          console.error('Evaluation failed:', error);
        } else {
          console.log('Evaluation completed:', data);
        }
      }
      
      onSubmit?.();
    } catch (error) {
      console.error("Submission failed:", error);
    }
  };

  return (
    <div className="h-full bg-slate-800 flex flex-col">
      <div className="border-b border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Code Editor</h2>
          <div className="flex items-center space-x-4">
            <Select value={language} onValueChange={setLanguage}>
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
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
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

      <div className="flex-1 p-4">
        <Textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="h-full bg-slate-900 border-slate-700 text-white font-mono resize-none"
          placeholder="Write your code here..."
        />
      </div>

      {output && (
        <div className="border-t border-slate-700 p-4">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center">
                Output
                <Badge className="ml-2 bg-green-600 text-white text-xs">Success</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-slate-300 text-sm whitespace-pre-wrap">
                {output}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CodeEditor;
