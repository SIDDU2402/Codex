
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

    // Evaluate each test case
    for (const testCase of testCases) {
      try {
        const result = await evaluateCode(
          submission.code,
          submission.language,
          testCase.input_data
        );

        const passed = result.output.trim() === testCase.expected_output.trim();
        
        if (passed) {
          totalScore += testCase.points || 0;
          passedTestCases++;
        }

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
        execution_time_ms: Math.max(...results.map(r => r.execution_time || 0)),
        memory_used_mb: Math.max(...results.map(r => r.memory_used || 0))
      })
      .eq('id', submissionId);

    return new Response(
      JSON.stringify({
        success: true,
        status: finalStatus,
        score: totalScore,
        passedTestCases,
        totalTestCases: testCases.length
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
      case 'javascript':
        output = await executeJavaScript(code, input);
        break;
      case 'python':
        output = await executePython(code, input);
        break;
      default:
        throw new Error(`Language ${language} is not supported yet`);
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

async function executeJavaScript(code: string, input: string): Promise<string> {
  // Create a sandboxed execution environment
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
      
      // If there's a solution function, call it
      if (typeof solution === 'function') {
        const result = solution();
        if (result !== undefined) {
          console.log(result);
        }
      }
      
      return output.trim();
    } catch (error) {
      throw new Error('Runtime Error: ' + error.message);
    }
  `;
  
  // Execute with timeout
  const result = await executeWithTimeout(wrappedCode, 5000);
  return result;
}

async function executePython(code: string, input: string): Promise<string> {
  // For Python, we'd need to use a Python runtime or subprocess
  // This is a placeholder implementation
  throw new Error('Python execution not implemented yet in this demo');
}

async function executeWithTimeout(code: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Time Limit Exceeded'));
    }, timeoutMs);
    
    try {
      // Use eval in a controlled manner (not recommended for production)
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
