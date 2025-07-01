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

interface Judge0Response {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  status: {
    id: number;
    description: string;
  } | null;
  time: string | null;
  memory: number | null;
  token: string;
}

// Language mapping for Judge0 API
const LANGUAGE_MAP: Record<string, number> = {
  'python': 71,     // Python 3.8.1
  'java': 62,       // Java (OpenJDK 13.0.1)
  'cpp': 54,        // C++ (GCC 9.2.0)
  'c': 50,          // C (GCC 9.2.0)
  'javascript': 63, // JavaScript (Node.js 12.14.0)
  'js': 63,         // JavaScript alias
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, language, testCases } = await req.json();
    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
    
    if (!rapidApiKey) {
      throw new Error('RapidAPI key not configured');
    }

    console.log(`[${new Date().toISOString()}] Executing ${language} code with ${testCases.length} test cases using Judge0`);
    
    // Validate inputs
    if (!code || typeof code !== 'string') {
      throw new Error('Code is required and must be a string');
    }
    
    if (!language || typeof language !== 'string') {
      throw new Error('Language is required and must be a string');
    }
    
    if (!Array.isArray(testCases) || testCases.length === 0) {
      throw new Error('At least one test case is required');
    }

    const languageId = LANGUAGE_MAP[language.toLowerCase()];
    if (!languageId) {
      throw new Error(`Language ${language} is not supported`);
    }

    const results = {
      success: true,
      testResults: [] as Array<{
        passed: boolean;
        input: string;
        expected: string;
        actual: string;
        error?: string;
        compilation_error?: string;
        execution_time: number;
        memory_used?: number;
        timeout?: boolean;
      }>,
      compilation_error: undefined as string | undefined
    };

    // Execute code for each test case
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`Running test case ${i + 1}/${testCases.length}`);
      
      try {
        const result = await executeWithJudge0(code, languageId, testCase.input_data, rapidApiKey);
        
        // Safe status checking with defaults
        const statusId = result?.status?.id ?? -1;
        const statusDescription = result?.status?.description ?? 'Unknown status';
        
        // Status 3 = Accepted, Status 4 = Wrong Answer, Status 5 = Time Limit Exceeded, etc.
        const isAccepted = statusId === 3;
        const isCompilationError = statusId === 6;
        const isRuntimeError = [4, 5, 7, 8, 9, 10, 11, 12].includes(statusId);
        
        const actualOutput = result?.stdout?.trim() || '';
        const expectedOutput = testCase.expected_output.trim();
        
        const passed = isAccepted && 
                      actualOutput === expectedOutput && 
                      !result?.stderr && 
                      !result?.compile_output;
        
        results.testResults.push({
          passed,
          input: testCase.input_data,
          expected: testCase.expected_output,
          actual: actualOutput,
          error: result?.stderr || (isRuntimeError ? `Runtime Error (Status: ${statusDescription})` : undefined),
          compilation_error: result?.compile_output || (isCompilationError ? `Compilation Error (Status: ${statusDescription})` : undefined),
          execution_time: parseFloat(result?.time || '0') * 1000, // Convert to ms
          memory_used: result?.memory ? Math.round(result.memory / 1024) : undefined, // Convert to KB
          timeout: statusId === 5 // Status 5 = Time Limit Exceeded
        });

        // Set compilation error if exists
        if ((result?.compile_output || isCompilationError) && !results.compilation_error) {
          results.compilation_error = result?.compile_output || `Compilation Error (Status: ${statusDescription})`;
          results.success = false;
        }

      } catch (error) {
        console.error(`Test case ${i + 1} execution error:`, error);
        results.testResults.push({
          passed: false,
          input: testCase.input_data,
          expected: testCase.expected_output,
          actual: '',
          error: error instanceof Error ? error.message : 'Unknown execution error',
          execution_time: 0
        });
        results.success = false;
      }
    }

    console.log(`Judge0 execution completed. Success: ${results.success}, Passed: ${results.testResults.filter(r => r.passed).length}/${results.testResults.length}`);

    return new Response(
      JSON.stringify(results),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Judge0 execution error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        testResults: []
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});

async function executeWithJudge0(
  code: string, 
  languageId: number, 
  input: string, 
  apiKey: string
): Promise<Judge0Response> {
  
  try {
    // Encode code and input in base64
    const encodedCode = btoa(unescape(encodeURIComponent(code)));
    const encodedInput = input ? btoa(unescape(encodeURIComponent(input))) : '';

    const submissionPayload = {
      language_id: languageId,
      source_code: encodedCode,
      stdin: encodedInput,
      base64_encoded: true,
      wait: true, // Wait for execution to complete
      cpu_time_limit: 10, // 10 seconds max CPU time
      wall_time_limit: 15, // 15 seconds max wall time
      memory_limit: 512000, // 512MB in KB
      max_processes_and_or_threads: 60,
      enable_per_process_and_thread_time_limit: false,
      enable_per_process_and_thread_memory_limit: false,
      max_file_size: 1024 // 1MB
    };

    console.log('Submitting to Judge0:', { 
      language_id: languageId, 
      has_input: !!input,
      code_length: code.length 
    });

    const response = await fetch('https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true&wait=true', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
        'X-RapidAPI-Key': apiKey,
      },
      body: JSON.stringify(submissionPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Judge0 API error response:', errorText);
      throw new Error(`Judge0 API error: ${response.status} - ${errorText}`);
    }

    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      console.error('Failed to parse Judge0 response as JSON:', parseError);
      throw new Error('Invalid JSON response from Judge0 API');
    }

    console.log('Judge0 raw response:', JSON.stringify(result, null, 2));
    
    // Validate and sanitize response structure
    if (!result || typeof result !== 'object') {
      console.error('Invalid response structure:', result);
      throw new Error('Invalid response structure from Judge0');
    }

    // Create a safe response object with defaults
    const safeResult: Judge0Response = {
      stdout: null,
      stderr: null,
      compile_output: null,
      status: null,
      time: null,
      memory: null,
      token: result.token || 'unknown'
    };

    // Safely decode base64 outputs
    try {
      if (result.stdout && typeof result.stdout === 'string') {
        safeResult.stdout = decodeURIComponent(escape(atob(result.stdout)));
      }
      if (result.stderr && typeof result.stderr === 'string') {
        safeResult.stderr = decodeURIComponent(escape(atob(result.stderr)));
      }
      if (result.compile_output && typeof result.compile_output === 'string') {
        safeResult.compile_output = decodeURIComponent(escape(atob(result.compile_output)));
      }
    } catch (decodeError) {
      console.error('Error decoding base64 outputs:', decodeError);
      // Keep encoded values if decoding fails
      safeResult.stdout = result.stdout || null;
      safeResult.stderr = result.stderr || null;
      safeResult.compile_output = result.compile_output || null;
    }

    // Safely handle status object
    if (result.status && typeof result.status === 'object') {
      safeResult.status = {
        id: typeof result.status.id === 'number' ? result.status.id : -1,
        description: typeof result.status.description === 'string' ? result.status.description : 'Unknown'
      };
    } else {
      // Default status if missing
      safeResult.status = {
        id: -1,
        description: 'Status information unavailable'
      };
    }

    // Handle time and memory safely
    safeResult.time = typeof result.time === 'string' ? result.time : null;
    safeResult.memory = typeof result.memory === 'number' ? result.memory : null;

    console.log('Processed Judge0 response:', {
      status: safeResult.status,
      stdout_length: safeResult.stdout?.length || 0,
      stderr_length: safeResult.stderr?.length || 0,
      compile_output_length: safeResult.compile_output?.length || 0,
      execution_time: safeResult.time,
      memory_used: safeResult.memory
    });

    return safeResult;

  } catch (error) {
    console.error('Judge0 execution error:', error);
    
    // Return a safe error response
    return {
      stdout: null,
      stderr: error instanceof Error ? error.message : 'Unknown execution error',
      compile_output: null,
      status: {
        id: -1,
        description: 'Execution failed'
      },
      time: null,
      memory: null,
      token: 'error'
    };
  }
}
