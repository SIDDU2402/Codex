import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestCase {
  id: string;
  input_data: string;
  expected_output: string;
  is_sample: boolean;
  points: number;
}

interface CompileResult {
  success: boolean;
  compilation_error?: string;
  testResults: Array<{
    passed: boolean;
    input: string;
    expected: string;
    actual: string;
    error?: string;
    compilation_error?: string;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, language, testCases } = await req.json();
    
    console.log(`Compiling and running ${language} code with ${testCases.length} test cases`);
    
    const results: CompileResult = {
      success: true,
      testResults: []
    };

    // Compile and run for each test case
    for (const testCase of testCases) {
      try {
        const result = await compileAndRun(code, language, testCase.input_data);
        
        const passed = result.output.trim() === testCase.expected_output.trim() && !result.error && !result.compilation_error;
        
        results.testResults.push({
          passed,
          input: testCase.input_data,
          expected: testCase.expected_output,
          actual: result.output,
          error: result.error,
          compilation_error: result.compilation_error
        });

        // If there's a compilation error, set it at the result level too
        if (result.compilation_error && !results.compilation_error) {
          results.compilation_error = result.compilation_error;
          results.success = false;
        }

      } catch (error) {
        results.testResults.push({
          passed: false,
          input: testCase.input_data,
          expected: testCase.expected_output,
          actual: '',
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify(results),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Compile and run error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        testResults: []
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

async function compileAndRun(code: string, language: string, input: string): Promise<{
  output: string;
  error?: string;
  compilation_error?: string;
}> {
  const startTime = Date.now();
  
  try {
    switch (language.toLowerCase()) {
      case 'python':
        return await executePython(code, input);
      case 'java':
        return await executeJava(code, input);
      case 'cpp':
      case 'c++':
        return await executeCpp(code, input);
      case 'c':
        return await executeC(code, input);
      case 'javascript':
        return await executeJavaScript(code, input);
      default:
        throw new Error(`Language ${language} is not supported`);
    }
  } catch (error) {
    return {
      output: '',
      error: error.message
    };
  }
}

async function executePython(code: string, input: string): Promise<{
  output: string;
  error?: string;
  compilation_error?: string;
}> {
  try {
    const tempFileName = `solution_${Date.now()}.py`;
    
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

    await Deno.writeTextFile(tempFileName, wrappedCode);
    
    const cmd = new Deno.Command("python3", {
      args: [tempFileName],
      stdin: "null",
      stdout: "piped",
      stderr: "piped",
    });
    
    const { code: exitCode, stdout, stderr } = await cmd.output();
    
    try {
      await Deno.remove(tempFileName);
    } catch {
      // Ignore cleanup errors
    }
    
    if (exitCode !== 0) {
      const errorMessage = new TextDecoder().decode(stderr);
      if (errorMessage.includes('SyntaxError') || errorMessage.includes('IndentationError')) {
        return {
          output: '',
          compilation_error: errorMessage
        };
      } else {
        return {
          output: '',
          error: errorMessage
        };
      }
    }
    
    return {
      output: new TextDecoder().decode(stdout)
    };
    
  } catch (error) {
    return {
      output: '',
      error: `Python execution error: ${error.message}`
    };
  }
}

async function executeJava(code: string, input: string): Promise<{
  output: string;
  error?: string;
  compilation_error?: string;
}> {
  try {
    const tempFileName = `Solution_${Date.now()}`;
    const javaFileName = `${tempFileName}.java`;
    
    const wrappedCode = code.replace(/public class \w+/, `public class ${tempFileName}`);
    
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
      
      // Clean up
      try {
        await Deno.remove(javaFileName);
      } catch {}
      
      return {
        output: '',
        compilation_error: errorMessage
      };
    }
    
    // Execute Java code with input
    const runCmd = new Deno.Command("java", {
      args: [tempFileName],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    });
    
    const process = runCmd.spawn();
    
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
      return {
        output: '',
        error: errorMessage
      };
    }
    
    return {
      output: new TextDecoder().decode(stdout)
    };
    
  } catch (error) {
    return {
      output: '',
      error: `Java execution error: ${error.message}`
    };
  }
}

async function executeCpp(code: string, input: string): Promise<{
  output: string;
  error?: string;
  compilation_error?: string;
}> {
  try {
    const tempFileName = `solution_${Date.now()}`;
    const cppFileName = `${tempFileName}.cpp`;
    const execFileName = tempFileName;
    
    await Deno.writeTextFile(cppFileName, code);
    
    const compileCmd = new Deno.Command("g++", {
      args: ["-o", execFileName, cppFileName],
      stdin: "null",
      stdout: "piped",
      stderr: "piped",
    });
    
    const { code: compileExitCode, stderr: compileStderr } = await compileCmd.output();
    
    if (compileExitCode !== 0) {
      const errorMessage = new TextDecoder().decode(compileStderr);
      
      try {
        await Deno.remove(cppFileName);
      } catch {}
      
      return {
        output: '',
        compilation_error: errorMessage
      };
    }
    
    const runCmd = new Deno.Command(`./${execFileName}`, {
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    });
    
    const process = runCmd.spawn();
    
    const writer = process.stdin.getWriter();
    await writer.write(new TextEncoder().encode(input));
    await writer.close();
    
    const { code: runExitCode, stdout, stderr } = await process.output();
    
    try {
      await Deno.remove(cppFileName);
      await Deno.remove(execFileName);
    } catch {}
    
    if (runExitCode !== 0) {
      const errorMessage = new TextDecoder().decode(stderr);
      return {
        output: '',
        error: errorMessage
      };
    }
    
    return {
      output: new TextDecoder().decode(stdout)
    };
    
  } catch (error) {
    return {
      output: '',
      error: `C++ execution error: ${error.message}`
    };
  }
}

async function executeC(code: string, input: string): Promise<{
  output: string;
  error?: string;
  compilation_error?: string;
}> {
  try {
    const tempFileName = `solution_${Date.now()}`;
    const cFileName = `${tempFileName}.c`;
    const execFileName = tempFileName;
    
    await Deno.writeTextFile(cFileName, code);
    
    const compileCmd = new Deno.Command("gcc", {
      args: ["-o", execFileName, cFileName],
      stdin: "null",
      stdout: "piped",
      stderr: "piped",
    });
    
    const { code: compileExitCode, stderr: compileStderr } = await compileCmd.output();
    
    if (compileExitCode !== 0) {
      const errorMessage = new TextDecoder().decode(compileStderr);
      
      try {
        await Deno.remove(cFileName);
      } catch {}
      
      return {
        output: '',
        compilation_error: errorMessage
      };
    }
    
    const runCmd = new Deno.Command(`./${execFileName}`, {
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    });
    
    const process = runCmd.spawn();
    
    const writer = process.stdin.getWriter();
    await writer.write(new TextEncoder().encode(input));
    await writer.close();
    
    const { code: runExitCode, stdout, stderr } = await process.output();
    
    try {
      await Deno.remove(cFileName);
      await Deno.remove(execFileName);
    } catch {}
    
    if (runExitCode !== 0) {
      const errorMessage = new TextDecoder().decode(stderr);
      return {
        output: '',
        error: errorMessage
      };
    }
    
    return {
      output: new TextDecoder().decode(stdout)
    };
    
  } catch (error) {
    return {
      output: '',
      error: `C execution error: ${error.message}`
    };
  }
}

async function executeJavaScript(code: string, input: string): Promise<{
  output: string;
  error?: string;
  compilation_error?: string;
}> {
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
  
  try {
    const func = new Function(wrappedCode);
    const result = func();
    return { output: result || '' };
  } catch (error) {
    return {
      output: '',
      error: error.message
    };
  }
}
