
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

        const passed = result.stdout?.trim() === testCase.expected_output.trim() && 
                      result.status.id === 3 && // Status 3 = Accepted
                      !result.stderr && 
                      !result.compile_output;
        
        if (passed) {
          totalScore += testCase.points || 0;
          passedTestCases++;
        }

        maxExecutionTime = Math.max(maxExecutionTime, parseFloat(result.time || '0') * 1000);
        maxMemoryUsed = Math.max(maxMemoryUsed, result.memory ? Math.round(result.memory / 1024) : 0);

      } catch (error) {
        console.error(`Test case evaluation error:`, error);
        // Continue with other test cases
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
        execution_time_ms: Math.round(maxExecutionTime),
        memory_used_mb: maxMemoryUsed
      })
      .eq('id', submissionId);

    console.log(`Evaluation completed: ${passedTestCases}/${testCases.length} passed, Score: ${totalScore}`);

    return new Response(
      JSON.stringify({
        success: true,
        status: finalStatus,
        score: totalScore,
        passedTestCases,
        totalTestCases: testCases.length,
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

async function executeWithJudge0(
  code: string, 
  languageId: number, 
  input: string, 
  apiKey: string
): Promise<{
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  status: { id: number; description: string };
  time: string | null;
  memory: number | null;
}> {
  
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
