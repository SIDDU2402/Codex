
import MonacoCodeEditor from './MonacoCodeEditor';

interface CodeEditorProps {
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

const CodeEditor = ({ problemId, contestId, onSubmit, testCases }: CodeEditorProps) => {
  return (
    <MonacoCodeEditor
      problemId={problemId}
      contestId={contestId}
      onSubmit={onSubmit}
      testCases={testCases}
    />
  );
};

export default CodeEditor;
