
import MonacoCodeEditor from './MonacoCodeEditor';

interface CodeEditorProps {
  problemId?: string;
  contestId?: string;
  onSubmit?: () => void;
}

const CodeEditor = ({ problemId, contestId, onSubmit }: CodeEditorProps) => {
  // Use the enhanced Monaco editor
  return (
    <MonacoCodeEditor
      problemId={problemId}
      contestId={contestId}
      onSubmit={onSubmit}
    />
  );
};

export default CodeEditor;
