
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
      /require\s*\(\s*['"]fs['"]\s*\)/i,
      /require\s*\(\s*['"]child_process['"]\s*\)/i,
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

async function createTempDirectory(): Promise<string> {
  const tempDir = `/tmp/code_exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  try {
    await Deno.mkdir(tempDir, { recursive: true });
    return tempDir;
  } catch (error) {
    throw new Error(`Failed to create temp directory: ${error.message}`);
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
    const tempDir = await createTempDirectory();
    const fileName = `${tempDir}/main.py`;
    
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

    await Deno.writeTextFile(fileName, wrappedCode);
    
    const cmd = new Deno.Command("python3", {
      args: [fileName],
      cwd: tempDir,
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
    
    // Cleanup
    try {
      await Deno.remove(tempDir, { recursive: true });
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
      error: `File write or access failed: ${error.message}`,
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
    const tempDir = await createTempDirectory();
    const fileName = `${tempDir}/Main.java`;
    
    // Extract class name from code or use default
    const classNameMatch = code.match(/public\s+class\s+(\w+)/);
    let finalCode = code;
    
    // Ensure the class name is "Main" for consistent execution
    if (classNameMatch && classNameMatch[1] !== 'Main') {
      finalCode = code.replace(/public\s+class\s+\w+/, 'public class Main');
    } else if (!classNameMatch) {
      // Wrap code in Main class if no public class found
      finalCode = `
public class Main {
    public static void main(String[] args) {
${code.split('\n').map(line => '        ' + line).join('\n')}
    }
}`;
    }
    
    await Deno.writeTextFile(fileName, finalCode);
    
    // Compile Java code
    const compileCmd = new Deno.Command("javac", {
      args: ["-cp", ".", "Main.java"],
      cwd: tempDir,
      stdin: "null",
      stdout: "piped",
      stderr: "piped",
    });
    
    const { code: compileExitCode, stderr: compileStderr } = await compileCmd.output();
    
    if (compileExitCode !== 0) {
      const errorMessage = new TextDecoder().decode(compileStderr);
      
      // Clean up
      try {
        await Deno.remove(tempDir, { recursive: true });
      } catch {}
      
      return {
        output: '',
        compilation_error: errorMessage,
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
        "Main"
      ],
      cwd: tempDir,
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
      await Deno.remove(tempDir, { recursive: true });
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
      error: `File write or access failed: ${error.message}`,
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
    const tempDir = await createTempDirectory();
    const sourceFile = `${tempDir}/main.cpp`;
    const execFile = `${tempDir}/main`;
    
    await Deno.writeTextFile(sourceFile, code);
    
    const compileCmd = new Deno.Command("g++", {
      args: ["-std=c++17", "-O2", "-o", "main", "main.cpp"],
      cwd: tempDir,
      stdin: "null",
      stdout: "piped",
      stderr: "piped",
    });
    
    const { code: compileExitCode, stderr: compileStderr } = await compileCmd.output();
    
    if (compileExitCode !== 0) {
      const errorMessage = new TextDecoder().decode(compileStderr);
      
      try {
        await Deno.remove(tempDir, { recursive: true });
      } catch {}
      
      return {
        output: '',
        compilation_error: errorMessage,
        execution_time: Date.now() - startTime
      };
    }
    
    const runCmd = new Deno.Command("timeout", {
      args: [`${Math.floor(EXECUTION_TIMEOUT / 1000)}s`, "./main"],
      cwd: tempDir,
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
      await Deno.remove(tempDir, { recursive: true });
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
      error: `File write or access failed: ${error.message}`,
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
    const tempDir = await createTempDirectory();
    const sourceFile = `${tempDir}/main.c`;
    const execFile = `${tempDir}/main`;
    
    await Deno.writeTextFile(sourceFile, code);
    
    const compileCmd = new Deno.Command("gcc", {
      args: ["-std=c11", "-O2", "-o", "main", "main.c"],
      cwd: tempDir,
      stdin: "null",
      stdout: "piped",
      stderr: "piped",
    });
    
    const { code: compileExitCode, stderr: compileStderr } = await compileCmd.output();
    
    if (compileExitCode !== 0) {
      const errorMessage = new TextDecoder().decode(compileStderr);
      
      try {
        await Deno.remove(tempDir, { recursive: true });
      } catch {}
      
      return {
        output: '',
        compilation_error: errorMessage,
        execution_time: Date.now() - startTime
      };
    }
    
    const runCmd = new Deno.Command("timeout", {
      args: [`${Math.floor(EXECUTION_TIMEOUT / 1000)}s`, "./main"],
      cwd: tempDir,
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
      await Deno.remove(tempDir, { recursive: true });
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
      error: `File write or access failed: ${error.message}`,
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
  
  try {
    const tempDir = await createTempDirectory();
    const fileName = `${tempDir}/main.js`;
    
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
  console.log = originalConsoleLog;
  process.stdout.write(output.trim());
} catch (error) {
  console.log = originalConsoleLog;
  if (error.message.includes('TIMEOUT')) {
    throw new Error('Time limit exceeded');
  }
  throw new Error('Runtime Error: ' + error.message);
}
`;
    
    await Deno.writeTextFile(fileName, wrappedCode);
    
    const runCmd = new Deno.Command("timeout", {
      args: [`${Math.floor(EXECUTION_TIMEOUT / 1000)}s`, "node", "main.js"],
      cwd: tempDir,
      stdin: "null",
      stdout: "piped",
      stderr: "piped",
    });
    
    const { code: runExitCode, stdout, stderr } = await runCmd.output();
    
    try {
      await Deno.remove(tempDir, { recursive: true });
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
        error: errorMessage.replace('Runtime Error: ', ''),
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
      error: `File write or access failed: ${error.message}`,
      execution_time: Date.now() - startTime
    };
  }
}
