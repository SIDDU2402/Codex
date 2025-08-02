
import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

interface EvaluationRequest {
  code: string;
  language: string;
  testCases: TestCase[];
}

interface TestResult {
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  error?: string;
  compilation_error?: string;
  execution_time: number;
  memory_used?: number;
  timeout?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, language, testCases }: EvaluationRequest = await req.json();
    const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    
    if (!openrouterApiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    console.log(`[${new Date().toISOString()}] AI Code Evaluation - ${language} with ${testCases.length} test cases`);
    
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

    const results = {
      success: true,
      testResults: [] as TestResult[],
      compilation_error: undefined as string | undefined
    };

    // First, check for compilation errors
    console.log('Checking compilation...');
    const compilationCheck = await checkCompilation(code, language, openrouterApiKey);
    if (compilationCheck.hasError) {
      console.log('Compilation error found:', compilationCheck.error);
      results.compilation_error = compilationCheck.error;
      results.success = false;
      
      // Return failed results for all test cases
      for (const testCase of testCases) {
        results.testResults.push({
          passed: false,
          input: testCase.input_data,
          expected: testCase.expected_output,
          actual: '',
          compilation_error: compilationCheck.error,
          execution_time: 0
        });
      }
      
      return new Response(
        JSON.stringify(results),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    console.log('Compilation successful, evaluating test cases...');

    // Evaluate each test case using Gemini AI
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`Evaluating test case ${i + 1}/${testCases.length}`);
      
      try {
        const result = await evaluateTestCase(code, language, testCase, openrouterApiKey);
        results.testResults.push(result);
        console.log(`Test case ${i + 1} result: ${result.passed ? 'PASSED' : 'FAILED'}`);
      } catch (error) {
        console.error(`Test case ${i + 1} evaluation error:`, error);
        results.testResults.push({
          passed: false,
          input: testCase.input_data,
          expected: testCase.expected_output,
          actual: '',
          error: error instanceof Error ? error.message : 'AI evaluation error',
          execution_time: 0
        });
        results.success = false;
      }
    }

    const passedCount = results.testResults.filter(r => r.passed).length;
    console.log(`AI evaluation completed. Success: ${results.success}, Passed: ${passedCount}/${results.testResults.length}`);

    return new Response(
      JSON.stringify(results),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('AI code evaluation error:', error);
    
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

async function checkCompilation(code: string, language: string, apiKey: string) {
  const prompt = `You are an expert code compiler and syntax checker. Analyze the following ${language} code for compilation errors, syntax errors, and basic structural issues.

Code to analyze:
\`\`\`${language}
${code}
\`\`\`

Instructions:
1. Check for syntax errors, missing imports, undefined variables, and other compilation issues
2. Consider the language-specific rules and conventions
3. If there are no compilation errors, respond with exactly "NO_ERRORS"
4. If there are compilation errors, provide a clear, concise error message

Response format: Either "NO_ERRORS" or a specific error message.`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: 'POST',
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://lovable.dev",
        "X-Title": "Lovable Coding Platform",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "tngtech/deepseek-r1t2-chimera:free",
        "messages": [
          {
            "role": "user",
            "content": prompt
          }
        ],
        "temperature": 0.1,
        "max_tokens": 500
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error response:', errorText);
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      console.error('Invalid OpenRouter API response structure:', JSON.stringify(data));
      throw new Error('Invalid response structure from OpenRouter API');
    }
    
    const result = data.choices[0].message.content.trim();
    
    return {
      hasError: result !== 'NO_ERRORS',
      error: result === 'NO_ERRORS' ? undefined : result
    };
  } catch (error) {
    console.error('Compilation check error:', error);
    // Return no error to allow execution to continue if compilation check fails
    return {
      hasError: false,
      error: undefined
    };
  }
}

async function evaluateTestCase(
  code: string, 
  language: string, 
  testCase: TestCase, 
  apiKey: string
): Promise<TestResult> {
  
  const startTime = Date.now();
  
  const prompt = `You are an expert code evaluator. Analyze the following ${language} code and determine what output it would produce for the given input.

Code to evaluate:
\`\`\`${language}
${code}
\`\`\`

Input:
${testCase.input_data}

Expected Output:
${testCase.expected_output}

Instructions:
1. Trace through the code logic step by step
2. Determine what the code would output for the given input
3. Compare with the expected output exactly (including whitespace and formatting)
4. Be very precise about whitespace, newlines, and formatting
5. Consider edge cases and potential runtime errors

Response format (JSON only, no other text):
{
  "actual_output": "the exact output the code would produce",
  "passes": true/false,
  "reasoning": "brief explanation of your evaluation",
  "has_runtime_error": true/false,
  "runtime_error": "error message if any"
}`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: 'POST',
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://lovable.dev",
        "X-Title": "Lovable Coding Platform",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "tngtech/deepseek-r1t2-chimera:free",
        "messages": [
          {
            "role": "user",
            "content": prompt
          }
        ],
        "temperature": 0.1,
        "max_tokens": 1000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error response:', errorText);
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      console.error('Invalid OpenRouter API response structure:', JSON.stringify(data));
      throw new Error('Invalid response structure from OpenRouter API');
    }
    
    const resultText = data.choices[0].message.content.trim();
    console.log('Raw OpenRouter response:', resultText);
    
    // Try to extract JSON from the response
    let jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // If no JSON found, try to parse the entire response
      jsonMatch = [resultText];
    }
    
    let aiResult;
    try {
      aiResult = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', resultText);
      throw new Error('AI returned invalid JSON response');
    }

    const executionTime = Date.now() - startTime;
    
    return {
      passed: aiResult.passes && !aiResult.has_runtime_error,
      input: testCase.input_data,
      expected: testCase.expected_output,
      actual: aiResult.actual_output || '',
      error: aiResult.has_runtime_error ? aiResult.runtime_error : undefined,
      execution_time: executionTime
    };

  } catch (error) {
    console.error('Test case evaluation error:', error);
    const executionTime = Date.now() - startTime;
    
    return {
      passed: false,
      input: testCase.input_data,
      expected: testCase.expected_output,
      actual: '',
      error: error instanceof Error ? error.message : 'AI evaluation failed',
      execution_time: executionTime
    };
  }
}
