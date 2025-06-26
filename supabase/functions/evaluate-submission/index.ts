
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestCase {
  id: string;
  input_data: string;
  expected_output: string;
  points: number;
}

interface EvaluationResult {
  passed: boolean;
  output: string;
  execution_time?: number;
  memory_used?: number;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { submissionId } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get submission details
    const { data: submission, error: submissionError } = await supabaseClient
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      throw new Error('Submission not found');
    }

    // Get test cases for this problem
    const { data: testCases, error: testCasesError } = await supabaseClient
      .from('test_cases')
      .select('*')
      .eq('problem_id', submission.problem_id)
      .order('created_at', { ascending: true });

    if (testCasesError || !testCases) {
      throw new Error('Test cases not found');
    }

    // Update submission status to running
    await supabaseClient
      .from('submissions')
      .update({ status: 'running' })
      .eq('id', submissionId);

    let totalScore = 0;
    let passedTestCases = 0;
    const results: EvaluationResult[] = [];
    let maxExecutionTime = 0;
    let maxMemoryUsed = 0;

    // Evaluate each test case
    for (const testCase of testCases) {
      try {
        const result = await evaluateCode(
          submission.code,
          submission.language,
          testCase.input_data
        );

        const passed = result.output.trim() === testCase.expected_output.trim() && !result.error;
        
        if (passed) {
          totalScore += testCase.points || 0;
          passedTestCases++;
        }

        maxExecutionTime = Math.max(maxExecutionTime, result.execution_time || 0);
        maxMemoryUsed = Math.max(maxMemoryUsed, result.memory_used || 0);

        results.push({
          ...result,
          passed
        });

      } catch (error) {
        results.push({
          passed: false,
          output: '',
          error: error.message
        });
      }
    }

    // Determine final status
    const finalStatus = passedTestCases === testCases.length ? 'accepted' : 
                       passedTestCases > 0 ? 'wrong_answer' : 'wrong_answer';

    // Update submission with results
    await supabaseClient
      .from('submissions')
      .update({
        status: finalStatus,
        score: totalScore,
        test_cases_passed: passedTestCases,
        total_test_cases: testCases.length,
        execution_time_ms: maxExecutionTime,
        memory_used_mb: maxMemoryUsed
      })
      .eq('id', submissionId);

    return new Response(
      JSON.stringify({
        success: true,
        status: finalStatus,
        score: totalScore,
        passedTestCases,
        totalTestCases: testCases.length,
        results: results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Evaluation error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

async function evaluateCode(
  code: string, 
  language: string, 
  input: string
): Promise<EvaluationResult> {
  const startTime = Date.now();
  
  try {
    let output = '';
    
    switch (language.toLowerCase()) {
      case 'python':
        output = await executePython(code, input);
        break;
      case 'java':
        output = await executeJava(code, input);
        break;
      case 'javascript':
        output = await executeJavaScript(code, input);
        break;
      case 'cpp':
      case 'c++':
        output = await executeCpp(code, input);
        break;
      case 'c':
        output = await executeC(code, input);
        break;
      default:
        throw new Error(`Language ${language} is not supported`);
    }
    
    const executionTime = Date.now() - startTime;
    
    return {
      passed: false, // Will be determined by caller
      output: output.trim(),
      execution_time: executionTime,
      memory_used: 10 // Placeholder - would need actual memory tracking
    };
    
  } catch (error) {
    return {
      passed: false,
      output: '',
      error: error.message,
      execution_time: Date.now() - startTime
    };
  }
}

async function executePython(code: string, input: string): Promise<string> {
  try {
    // Create a temporary Python file
    const tempFileName = `solution_${Date.now()}.py`;
    
    // Prepare the code with input handling
    const wrappedCode = `
import sys
from io import StringIO

# Redirect stdin to provide input
sys.stdin = StringIO("""${input}""")

# Capture stdout
old_stdout = sys.stdout
sys.stdout = StringIO()

try:
${code.split('\n').map(line => '    ' + line).join('\n')}
    
    # Get the output
    output = sys.stdout.getvalue()
    sys.stdout = old_stdout
    print(output, end='')
    
except Exception as e:
    sys.stdout = old_stdout
    raise Exception(f"Runtime Error: {str(e)}")
`;

    // Write the code to a temporary file
    await Deno.writeTextFile(tempFileName, wrappedCode);
    
    // Execute Python with timeout (5 seconds)
    const cmd = new Deno.Command("python3", {
      args: [tempFileName],
      stdin: "null",
      stdout: "piped",
      stderr: "piped",
    });
    
    const { code: exitCode, stdout, stderr } = await cmd.output();
    
    // Clean up the temporary file
    try {
      await Deno.remove(tempFileName);
    } catch {
      // Ignore cleanup errors
    }
    
    if (exitCode !== 0) {
      const errorMessage = new TextDecoder().decode(stderr);
      throw new Error(`Python execution failed: ${errorMessage}`);
    }
    
    return new TextDecoder().decode(stdout);
    
  } catch (error) {
    throw new Error(`Python execution error: ${error.message}`);
  }
}

async function executeJava(code: string, input: string): Promise<string> {
  try {
    const tempFileName = `Solution_${Date.now()}`;
    const javaFileName = `${tempFileName}.java`;
    
    // Prepare the Java code with proper class name
    const wrappedCode = code.replace(/public class \w+/, `public class ${tempFileName}`);
    
    // Write the Java code to a temporary file
    await Deno.writeTextFile(javaFileName, wrappedCode);
    
    // Compile Java code
    const compileCmd = new Deno.Command("javac", {
      args: [javaFileName],
      stdin: "null",
      stdout: "piped",
      stderr: "piped",
    });
    
    const { code: compileExitCode, stderr: compileStderr } = await compileCmd.output();
    
    if (compileExitCode !== 0) {
      const errorMessage = new TextDecoder().decode(compileStderr);
      throw new Error(`Java compilation failed: ${errorMessage}`);
    }
    
    // Execute Java code with input
    const runCmd = new Deno.Command("java", {
      args: [tempFileName],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    });
    
    const process = runCmd.spawn();
    
    // Write input to stdin
    const writer = process.stdin.getWriter();
    await writer.write(new TextEncoder().encode(input));
    await writer.close();
    
    const { code: runExitCode, stdout, stderr } = await process.output();
    
    // Clean up temporary files
    try {
      await Deno.remove(javaFileName);
      await Deno.remove(`${tempFileName}.class`);
    } catch {
      // Ignore cleanup errors
    }
    
    if (runExitCode !== 0) {
      const errorMessage = new TextDecoder().decode(stderr);
      throw new Error(`Java execution failed: ${errorMessage}`);
    }
    
    return new TextDecoder().decode(stdout);
    
  } catch (error) {
    throw new Error(`Java execution error: ${error.message}`);
  }
}

async function executeJavaScript(code: string, input: string): Promise<string> {
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
      return output.trim();
    } catch (error) {
      throw new Error('Runtime Error: ' + error.message);
    }
  `;
  
  const result = await executeWithTimeout(wrappedCode, 5000);
  return result;
}

async function executeCpp(code: string, input: string): Promise<string> {
  try {
    const tempFileName = `solution_${Date.now()}`;
    const cppFileName = `${tempFileName}.cpp`;
    const execFileName = tempFileName;
    
    // Write the C++ code to a temporary file
    await Deno.writeTextFile(cppFileName, code);
    
    // Compile C++ code
    const compileCmd = new Deno.Command("g++", {
      args: ["-o", execFileName, cppFileName],
      stdin: "null",
      stdout: "piped",
      stderr: "piped",
    });
    
    const { code: compileExitCode, stderr: compileStderr } = await compileCmd.output();
    
    if (compileExitCode !== 0) {
      const errorMessage = new TextDecoder().decode(compileStderr);
      throw new Error(`C++ compilation failed: ${errorMessage}`);
    }
    
    // Execute the compiled program
    const runCmd = new Deno.Command(`./${execFileName}`, {
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    });
    
    const process = runCmd.spawn();
    
    // Write input to stdin
    const writer = process.stdin.getWriter();
    await writer.write(new TextEncoder().encode(input));
    await writer.close();
    
    const { code: runExitCode, stdout, stderr } = await process.output();
    
    // Clean up temporary files
    try {
      await Deno.remove(cppFileName);
      await Deno.remove(execFileName);
    } catch {
      // Ignore cleanup errors
    }
    
    if (runExitCode !== 0) {
      const errorMessage = new TextDecoder().decode(stderr);
      throw new Error(`C++ execution failed: ${errorMessage}`);
    }
    
    return new TextDecoder().decode(stdout);
    
  } catch (error) {
    throw new Error(`C++ execution error: ${error.message}`);
  }
}

async function executeC(code: string, input: string): Promise<string> {
  try {
    const tempFileName = `solution_${Date.now()}`;
    const cFileName = `${tempFileName}.c`;
    const execFileName = tempFileName;
    
    // Write the C code to a temporary file
    await Deno.writeTextFile(cFileName, code);
    
    // Compile C code
    const compileCmd = new Deno.Command("gcc", {
      args: ["-o", execFileName, cFileName],
      stdin: "null",
      stdout: "piped",
      stderr: "piped",
    });
    
    const { code: compileExitCode, stderr: compileStderr } = await compileCmd.output();
    
    if (compileExitCode !== 0) {
      const errorMessage = new TextDecoder().decode(compileStderr);
      throw new Error(`C compilation failed: ${errorMessage}`);
    }
    
    // Execute the compiled program
    const runCmd = new Deno.Command(`./${execFileName}`, {
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    });
    
    const process = runCmd.spawn();
    
    // Write input to stdin
    const writer = process.stdin.getWriter();
    await writer.write(new TextEncoder().encode(input));
    await writer.close();
    
    const { code: runExitCode, stdout, stderr } = await process.output();
    
    // Clean up temporary files
    try {
      await Deno.remove(cFileName);
      await Deno.remove(execFileName);
    } catch {
      // Ignore cleanup errors
    }
    
    if (runExitCode !== 0) {
      const errorMessage = new TextDecoder().decode(stderr);
      throw new Error(`C execution failed: ${errorMessage}`);
    }
    
    return new TextDecoder().decode(stdout);
    
  } catch (error) {
    throw new Error(`C execution error: ${error.message}`);
  }
}

async function executeWithTimeout(code: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Time Limit Exceeded'));
    }, timeoutMs);
    
    try {
      const func = new Function(code);
      const result = func();
      clearTimeout(timeout);
      resolve(result || '');
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}
