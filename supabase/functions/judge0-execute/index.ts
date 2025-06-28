
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
  };
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
      }>
    };

    // Execute code for each test case
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`Running test case ${i + 1}/${testCases.length}`);
      
      try {
        const result = await executeWithJudge0(code, languageId, testCase.input_data, rapidApiKey);
        
        const passed = result.stdout?.trim() === testCase.expected_output.trim() && 
                      result.status.id === 3 && // Status 3 = Accepted
                      !result.stderr && 
                      !result.compile_output;
        
        results.testResults.push({
          passed,
          input: testCase.input_data,
          expected: testCase.expected_output,
          actual: result.stdout || '',
          error: result.stderr || undefined,
          compilation_error: result.compile_output || undefined,
          execution_time: parseFloat(result.time || '0') * 1000, // Convert to ms
          memory_used: result.memory ? Math.round(result.memory / 1024) : undefined, // Convert to KB
          timeout: result.status.id === 5 // Status 5 = Time Limit Exceeded
        });

        if (result.compile_output && !results.compilation_error) {
          results.compilation_error = result.compile_output;
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

async function executeWithJudge0(
  code: string, 
  languageId: number, 
  input: string, 
  apiKey: string
): Promise<Judge0Response> {
  
  // Encode code and input in base64
  const encodedCode = btoa(code);
  const encodedInput = input ? btoa(input) : '';

  const submissionPayload = {
    language_id: languageId,
    source_code: encodedCode,
    stdin: encodedInput,
    base64_encoded: true,
    wait: true, // Wait for execution to complete
    wall_time_limit: 10, // 10 seconds max
    memory_limit: 512000, // 512MB in KB
  };

  const response = await fetch('https://judge0-ce.p.rapidapi.com/submissions', {
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
    throw new Error(`Judge0 API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  
  // Decode base64 outputs
  if (result.stdout) {
    result.stdout = atob(result.stdout);
  }
  if (result.stderr) {
    result.stderr = atob(result.stderr);
  }
  if (result.compile_output) {
    result.compile_output = atob(result.compile_output);
  }

  return result;
}
