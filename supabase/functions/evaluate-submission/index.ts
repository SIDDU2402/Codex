
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { submissionId } = await req.json();
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Starting evaluation for submission ${submissionId}`);

    // Get submission details
    const { data: submission, error: submissionError } = await supabaseClient
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      console.error('Submission not found:', submissionError);
      throw new Error('Submission not found');
    }

    // Get test cases for this problem
    const { data: testCases, error: testCasesError } = await supabaseClient
      .from('test_cases')
      .select('*')
      .eq('problem_id', submission.problem_id)
      .order('created_at', { ascending: true });

    if (testCasesError || !testCases) {
      console.error('Test cases not found:', testCasesError);
      throw new Error('Test cases not found');
    }

    // Update submission status to running
    await supabaseClient
      .from('submissions')
      .update({ status: 'running' })
      .eq('id', submissionId);

    console.log(`AI evaluating submission ${submissionId} with ${testCases.length} test cases`);

    // Use the AI code evaluator with Gemini
    const { data: evaluationResult, error: evaluationError } = await supabaseClient.functions.invoke('ai-code-evaluator', {
      body: {
        code: submission.code,
        language: submission.language,
        testCases: testCases
      }
    });

    if (evaluationError) {
      console.error('AI evaluation error:', evaluationError);
      throw new Error(`AI evaluation failed: ${evaluationError.message}`);
    }

    if (!evaluationResult || !evaluationResult.testResults) {
      console.error('Invalid AI evaluation response:', evaluationResult);
      throw new Error('Invalid AI evaluation response');
    }

    console.log('AI evaluation result:', evaluationResult);

    let totalScore = 0;
    let passedTestCases = 0;
    let maxExecutionTime = 0;
    let hasCompilationError = false;
    let compilationErrorMsg = '';

    // Process AI evaluation results
    if (evaluationResult.compilation_error) {
      hasCompilationError = true;
      compilationErrorMsg = evaluationResult.compilation_error;
    } else {
      for (let i = 0; i < evaluationResult.testResults.length; i++) {
        const result = evaluationResult.testResults[i];
        const testCase = testCases[i];
        
        if (result.passed) {
          totalScore += testCase.points || 0;
          passedTestCases++;
        }

        // Track execution metrics
        maxExecutionTime = Math.max(maxExecutionTime, result.execution_time || 0);
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
      memory_used_mb: 0 // AI evaluation doesn't measure memory
    };

    if (hasCompilationError) {
      updateData.error_message = compilationErrorMsg;
    }

    await supabaseClient
      .from('submissions')
      .update(updateData)
      .eq('id', submissionId);

    console.log(`AI evaluation completed: ${passedTestCases}/${testCases.length} passed, Score: ${totalScore}, Status: ${finalStatus}`);

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
    console.error('AI evaluation error:', error);
    
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
