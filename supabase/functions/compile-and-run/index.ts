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
    execution_time: number;
    memory_used?: number;
    timeout?: boolean;
  }>;
}

const EXECUTION_TIMEOUT = 10000; // 10 seconds
const MEMORY_LIMIT = 512; // 512MB

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, language, testCases } = await req.json();
    
    console.log(`[${new Date().toISOString()}] Compiling and running ${language} code with ${testCases.length} test cases`);
    
    // Input validation
    if (!code || typeof code !== 'string') {
      throw new Error('Code is required and must be a string');
    }
    
    if (!language || typeof language !== 'string') {
      throw new Error('Language is required and must be a string');
    }
    
    if (!Array.isArray(testCases) || testCases.length === 0) {
      throw new Error('At least one test case is required');
    }

    // Security: Check for potentially dangerous patterns
    const dangerousPatterns = [
      /import\s+os/i,
      /import\s+subprocess/i,
      /eval\s*\(/i,
      /exec\s*\(/i,
      /system\s*\(/i,
      /Runtime\.getRuntime/i,
      /ProcessBuilder/i,
      /\.exec\s*\(/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        throw new Error('Code contains potentially dangerous operations');
      }
    }
    
    const results: CompileResult = {
      success: true,
      testResults: []
    };

    // Compile and run for each test case
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`Running test case ${i + 1}/${testCases.length}`);
      
      try {
        const result = await compileAndRun(code, language, testCase.input_data);
        
        const passed = result.output.trim() === testCase.expected_output.trim() && 
                      !result.error && 
                      !result.compilation_error && 
                      !result.timeout;
        
        results.testResults.push({
          passed,
          input: testCase.input_data,
          expected: testCase.expected_output,
          actual: result.output,
          error: result.error,
          compilation_error: result.compilation_error,
          execution_time: result.execution_time,
          memory_used: result.memory_used,
          timeout: result.timeout
        });

        // If there's a compilation error, set it at the result level too
        if (result.compilation_error && !results.compilation_error) {
          results.compilation_error = result.compilation_error;
          results.success = false;
        }

      } catch (error) {
        console.error(`Test case ${i + 1} execution error:`, error);
        results.testResults.push({
          passed: false,
          input: testCase.input_data,
          expected: testCase.expected_output,
          actual: '',
          error: error.message,
          execution_time: 0
        });
        results.success = false;
      }
    }

    console.log(`Execution completed. Success: ${results.success}, Passed: ${results.testResults.filter(r => r.passed).length}/${results.testResults.length}`);

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
        status: 400 
      }
    );
  }
});

async function compileAndRun(code: string, language: string, input: string): Promise<{
  output: string;
  error?: string;
  compilation_error?: string;
  execution_time: number;
  memory_used?: number;
  timeout?: boolean;
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
      case 'js':
        return await executeJavaScript(code, input);
      default:
        throw new Error(`Language ${language} is not supported`);
    }
  } catch (error) {
    return {
      output: '',
      error: error.message,
      execution_time: Date.now() - startTime
    };
  }
}

async function executePython(code: string, input: string): Promise<{
  output: string;
  error?: string;
  compilation_error?: string;
  execution_time: number;
  memory_used?: number;
  timeout?: boolean;
}> {
  const startTime = Date.now();
  
  try {
    const tempFileName = `solution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.py`;
    
    // Enhanced Python wrapper with better error handling and security
    const wrappedCode = `
import sys
import signal
from io import StringIO
import resource

# Set memory limit
try:
    resource.setrlimit(resource.RLIMIT_AS, (${MEMORY_LIMIT} * 1024 * 1024, ${MEMORY_LIMIT} * 1024 * 1024))
except:
    pass

# Timeout handler
def timeout_handler(signum, frame):
    raise TimeoutError("Code execution timed out")

signal.signal(signal.SIGALRM, timeout_handler)
signal.alarm(${Math.floor(EXECUTION_TIMEOUT / 1000)})

# Redirect stdin to provide input
sys.stdin = StringIO("""${input.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}""")

# Capture stdout
old_stdout = sys.stdout
sys.stdout = StringIO()

try:
${code.split('\n').map(line => '    ' + line).join('\n')}
    
    # Get the output
    output = sys.stdout.getvalue()
    sys.stdout = old_stdout
    print(output, end='')
    
except TimeoutError:
    sys.stdout = old_stdout
    raise Exception("TIMEOUT: Code execution exceeded time limit")
except MemoryError:
    sys.stdout = old_stdout
    raise Exception("MEMORY_ERROR: Code exceeded memory limit")
except Exception as e:
    sys.stdout = old_stdout
    raise Exception(f"RUNTIME_ERROR: {str(e)}")
finally:
    signal.alarm(0)
`;

    await Deno.writeTextFile(tempFileName, wrappedCode);
    
    const cmd = new Deno.Command("python3", {
      args: [tempFileName],
      stdin: "null",
      stdout: "piped",
      stderr: "piped",
    });
    
    const process = cmd.spawn();
    
    // Implement timeout at Deno level too
    const timeoutId = setTimeout(() => {
      try {
        process.kill();
      } catch {}
    }, EXECUTION_TIMEOUT);
    
    const { code: exitCode, stdout, stderr } = await process.output();
    clearTimeout(timeoutId);
    
    try {
      await Deno.remove(tempFileName);
    } catch {
      // Ignore cleanup errors
    }
    
    const executionTime = Date.now() - startTime;
    const errorMessage = new TextDecoder().decode(stderr);
    
    if (exitCode !== 0) {
      if (errorMessage.includes('TIMEOUT')) {
        return {
          output: '',
          error: 'Time limit exceeded',
          execution_time: executionTime,
          timeout: true
        };
      } else if (errorMessage.includes('MEMORY_ERROR')) {
        return {
          output: '',
          error: 'Memory limit exceeded',
          execution_time: executionTime
        };
      } else if (errorMessage.includes('SyntaxError') || errorMessage.includes('IndentationError')) {
        return {
          output: '',
          compilation_error: errorMessage.replace(/File ".*?", /, ''),
          execution_time: executionTime
        };
      } else {
        return {
          output: '',
          error: errorMessage.replace(/File ".*?", /, '').replace(/RUNTIME_ERROR: /, ''),
          execution_time: executionTime
        };
      }
    }
    
    return {
      output: new TextDecoder().decode(stdout),
      execution_time: executionTime
    };
    
  } catch (error) {
    return {
      output: '',
      error: `Python execution error: ${error.message}`,
      execution_time: Date.now() - startTime
    };
  }
}

async function executeJava(code: string, input: string): Promise<{
  output: string;
  error?: string;
  compilation_error?: string;
  execution_time: number;
  memory_used?: number;
  timeout?: boolean;
}> {
  const startTime = Date.now();
  
  try {
    const tempFileName = `Solution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const javaFileName = `${tempFileName}.java`;
    
    // Extract class name from code or use default
    const classNameMatch = code.match(/public\s+class\s+(\w+)/);
    const className = classNameMatch ? classNameMatch[1] : 'Solution';
    
    const wrappedCode = code.replace(/public\s+class\s+\w+/, `public class ${tempFileName}`);
    
    await Deno.writeTextFile(javaFileName, wrappedCode);
    
    // Compile Java code
    const compileCmd = new Deno.Command("javac", {
      args: ["-cp", ".", javaFileName],
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
        compilation_error: errorMessage.replace(new RegExp(tempFileName, 'g'), className),
        execution_time: Date.now() - startTime
      };
    }
    
    // Execute Java code with input and timeout
    const runCmd = new Deno.Command("timeout", {
      args: [
        `${Math.floor(EXECUTION_TIMEOUT / 1000)}s`,
        "java",
        "-Xmx512m", // Memory limit
        "-cp", ".",
        tempFileName
      ],
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
    
    const executionTime = Date.now() - startTime;
    
    if (runExitCode === 124) { // timeout exit code
      return {
        output: '',
        error: 'Time limit exceeded',
        execution_time: executionTime,
        timeout: true
      };
    }
    
    if (runExitCode !== 0) {
      const errorMessage = new TextDecoder().decode(stderr);
      return {
        output: '',
        error: errorMessage.replace(new RegExp(tempFileName, 'g'), className),
        execution_time: executionTime
      };
    }
    
    return {
      output: new TextDecoder().decode(stdout),
      execution_time: executionTime
    };
    
  } catch (error) {
    return {
      output: '',
      error: `Java execution error: ${error.message}`,
      execution_time: Date.now() - startTime
    };
  }
}

async function executeCpp(code: string, input: string): Promise<{
  output: string;
  error?: string;
  compilation_error?: string;
  execution_time: number;
  memory_used?: number;
  timeout?: boolean;
}> {
  const startTime = Date.now();
  
  try {
    const tempFileName = `solution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const cppFileName = `${tempFileName}.cpp`;
    const execFileName = tempFileName;
    
    await Deno.writeTextFile(cppFileName, code);
    
    const compileCmd = new Deno.Command("g++", {
      args: ["-std=c++17", "-O2", "-o", execFileName, cppFileName],
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
        compilation_error: errorMessage,
        execution_time: Date.now() - startTime
      };
    }
    
    const runCmd = new Deno.Command("timeout", {
      args: [`${Math.floor(EXECUTION_TIMEOUT / 1000)}s`, `./${execFileName}`],
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
    
    const executionTime = Date.now() - startTime;
    
    if (runExitCode === 124) {
      return {
        output: '',
        error: 'Time limit exceeded',
        execution_time: executionTime,
        timeout: true
      };
    }
    
    if (runExitCode !== 0) {
      const errorMessage = new TextDecoder().decode(stderr);
      return {
        output: '',
        error: errorMessage,
        execution_time: executionTime
      };
    }
    
    return {
      output: new TextDecoder().decode(stdout),
      execution_time: executionTime
    };
    
  } catch (error) {
    return {
      output: '',
      error: `C++ execution error: ${error.message}`,
      execution_time: Date.now() - startTime
    };
  }
}

async function executeC(code: string, input: string): Promise<{
  output: string;
  error?: string;
  compilation_error?: string;
  execution_time: number;
  memory_used?: number;
  timeout?: boolean;
}> {
  const startTime = Date.now();
  
  try {
    const tempFileName = `solution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const cFileName = `${tempFileName}.c`;
    const execFileName = tempFileName;
    
    await Deno.writeTextFile(cFileName, code);
    
    const compileCmd = new Deno.Command("gcc", {
      args: ["-std=c11", "-O2", "-o", execFileName, cFileName],
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
        compilation_error: errorMessage,
        execution_time: Date.now() - startTime
      };
    }
    
    const runCmd = new Deno.Command("timeout", {
      args: [`${Math.floor(EXECUTION_TIMEOUT / 1000)}s`, `./${execFileName}`],
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
    
    const executionTime = Date.now() - startTime;
    
    if (runExitCode === 124) {
      return {
        output: '',
        error: 'Time limit exceeded',
        execution_time: executionTime,
        timeout: true
      };
    }
    
    if (runExitCode !== 0) {
      const errorMessage = new TextDecoder().decode(stderr);
      return {
        output: '',
        error: errorMessage,
        execution_time: executionTime
      };
    }
    
    return {
      output: new TextDecoder().decode(stdout),
      execution_time: executionTime
    };
    
  } catch (error) {
    return {
      output: '',
      error: `C execution error: ${error.message}`,
      execution_time: Date.now() - startTime
    };
  }
}

async function executeJavaScript(code: string, input: string): Promise<{
  output: string;
  error?: string;
  compilation_error?: string;
  execution_time: number;
  memory_used?: number;
  timeout?: boolean;
}> {
  const startTime = Date.now();
  
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
      // Set timeout
      const timeoutId = setTimeout(() => {
        throw new Error('TIMEOUT: Code execution exceeded time limit');
      }, ${EXECUTION_TIMEOUT});
      
      ${code}
      
      clearTimeout(timeoutId);
      return output.trim();
    } catch (error) {
      if (error.message.includes('TIMEOUT')) {
        throw new Error('Time limit exceeded');
      }
      throw new Error('Runtime Error: ' + error.message);
    }
  `;
  
  try {
    const func = new Function(wrappedCode);
    const result = func();
    return {
      output: result || '',
      execution_time: Date.now() - startTime
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    if (error.message.includes('Time limit exceeded')) {
      return {
        output: '',
        error: 'Time limit exceeded',
        execution_time: executionTime,
        timeout: true
      };
    }
    
    return {
      output: '',
      error: error.message.replace('Runtime Error: ', ''),
      execution_time: executionTime
    };
  }
}
