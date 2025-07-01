import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const { submissionId } = await req.json();
    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
    
    if (!rapidApiKey) {
      throw new Error('RapidAPI key not configured');
    }
    
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

    const languageId = LANGUAGE_MAP[submission.language.toLowerCase()];
    if (!languageId) {
      throw new Error(`Language ${submission.language} is not supported`);
    }

    // Update submission status to running
    await supabaseClient
      .from('submissions')
      .update({ status: 'running' })
      .eq('id', submissionId);

    let totalScore = 0;
    let passedTestCases = 0;
    let maxExecutionTime = 0;
    let maxMemoryUsed = 0;
    let hasCompilationError = false;
    let compilationErrorMsg = '';

    console.log(`Evaluating submission ${submissionId} with ${testCases.length} test cases using Judge0`);

    // Evaluate each test case using Judge0
    for (const testCase of testCases) {
      try {
        const result = await executeWithJudge0(
          submission.code,
          languageId,
          testCase.input_data,
          rapidApiKey
        );

        // Safe status checking
        const statusId = result?.status?.id ?? -1;
        const isAccepted = statusId === 3;
        const isCompilationError = statusId === 6;

        if (isCompilationError && result?.compile_output) {
          hasCompilationError = true;
          compilationErrorMsg = result.compile_output;
          break; // Stop on compilation error
        }

        const actualOutput = result?.stdout?.trim() || '';
        const expectedOutput = testCase.expected_output.trim();
        
        const passed = isAccepted && 
                      actualOutput === expectedOutput && 
                      !result?.stderr && 
                      !result?.compile_output;
        
        if (passed) {
          totalScore += testCase.points || 0;
          passedTestCases++;
        }

        // Track execution metrics
        const executionTime = parseFloat(result?.time || '0') * 1000;
        const memoryUsed = result?.memory ? Math.round(result.memory / 1024) : 0;
        
        maxExecutionTime = Math.max(maxExecutionTime, executionTime);
        maxMemoryUsed = Math.max(maxMemoryUsed, memoryUsed);

      } catch (error) {
        console.error(`Test case evaluation error:`, error);
        // Continue with other test cases even if one fails
      }
    }

    // Determine final status
    let finalStatus = 'wrong_answer';
    if (hasCompilationError) {
      finalStatus = 'compilation_error';
    } else if (passedTestCases === testCases.length) {
      finalStatus = 'accepted';
    } else if (passedTestCases > 0) {
      finalStatus = 'partial_correct';
    }

    // Update submission with results
    const updateData: any = {
      status: finalStatus,
      score: totalScore,
      test_cases_passed: passedTestCases,
      total_test_cases: testCases.length,
      execution_time_ms: Math.round(maxExecutionTime),
      memory_used_mb: maxMemoryUsed
    };

    if (hasCompilationError) {
      updateData.compilation_error = compilationErrorMsg;
    }

    await supabaseClient
      .from('submissions')
      .update(updateData)
      .eq('id', submissionId);

    console.log(`Evaluation completed: ${passedTestCases}/${testCases.length} passed, Score: ${totalScore}, Status: ${finalStatus}`);

    return new Response(
      JSON.stringify({
        success: true,
        status: finalStatus,
        score: totalScore,
        passedTestCases,
        totalTestCases: testCases.length,
        hasCompilationError,
        compilationError: hasCompilationError ? compilationErrorMsg : undefined
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
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

async function executeWithJudge0(
  code: string, 
  languageId: number, 
  input: string, 
  apiKey: string
): Promise<{
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  status: { id: number; description: string } | null;
  time: string | null;
  memory: number | null;
}> {
  
  try {
    // Encode code and input in base64 with proper UTF-8 handling
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
      throw new Error(`Judge0 API error: ${response.status} - ${errorText}`);
    }

    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      throw new Error('Failed to parse Judge0 response as JSON');
    }
    
    // Create safe response with proper error handling
    const safeResult = {
      stdout: null as string | null,
      stderr: null as string | null,
      compile_output: null as string | null,
      status: null as { id: number; description: string } | null,
      time: null as string | null,
      memory: null as number | null
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
      // Keep encoded values if decoding fails
      safeResult.stdout = result.stdout || null;
      safeResult.stderr = result.stderr || null;
      safeResult.compile_output = result.compile_output || null;
    }

    // Safely handle status
    if (result.status && typeof result.status === 'object') {
      safeResult.status = {
        id: typeof result.status.id === 'number' ? result.status.id : -1,
        description: typeof result.status.description === 'string' ? result.status.description : 'Unknown'
      };
    } else {
      safeResult.status = {
        id: -1,
        description: 'Status unavailable'
      };
    }

    safeResult.time = typeof result.time === 'string' ? result.time : null;
    safeResult.memory = typeof result.memory === 'number' ? result.memory : null;

    return safeResult;

  } catch (error) {
    // Return safe error response
    return {
      stdout: null,
      stderr: error instanceof Error ? error.message : 'Execution failed',
      compile_output: null,
      status: {
        id: -1,
        description: 'Execution error'
      },
      time: null,
      memory: null
    };
  }
}
