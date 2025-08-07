
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
  problemTitle?: string;
  problemDescription?: string;
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
        const result = await evaluateTestCaseWithRetry(code, language, testCase, openrouterApiKey, 3);
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
  const prompt = `You are a professional code compiler. Your job is to analyze code for compilation errors with absolute precision.

TASK: Check this ${language} code for compilation errors, syntax errors, missing imports, and structural issues.

CODE TO ANALYZE:
\`\`\`${language}
${code}
\`\`\`

COMPILER REQUIREMENTS:
1. Act exactly like a ${language} compiler would
2. Check syntax, imports, variable declarations, function definitions
3. Verify language-specific rules and conventions
4. Be strict and precise in your analysis

RESPONSE FORMAT (CRITICAL):
- If NO compilation errors exist: respond with exactly "NO_ERRORS"
- If compilation errors exist: provide a clear, specific error message
- Do NOT use JSON format
- Do NOT add explanations or extra text`;

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
        "model": "openai/gpt-oss-20b:free",
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

async function evaluateTestCaseWithRetry(
  code: string, 
  language: string, 
  testCase: TestCase, 
  apiKey: string,
  maxRetries: number = 3
): Promise<TestResult> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Test case evaluation attempt ${attempt}/${maxRetries}`);
      const result = await evaluateTestCase(code, language, testCase, apiKey);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.error(`Attempt ${attempt} failed:`, lastError.message);
      
      // Don't retry on certain types of errors
      if (lastError.message.includes('API error') || attempt === maxRetries) {
        throw lastError;
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}

async function evaluateTestCase(
  code: string, 
  language: string, 
  testCase: TestCase, 
  apiKey: string
): Promise<TestResult> {
  
  const startTime = Date.now();
  
  const prompt = `You are a professional ${language} compiler and runtime environment. Execute this code with complete accuracy.

EXECUTION TASK:
Compile and run this ${language} code with the provided input data. Act as a real ${language} interpreter.

CODE:
\`\`\`${language}
${code}
\`\`\`

INPUT (to be provided via stdin/input()):
${testCase.input_data}

EXECUTION INSTRUCTIONS:
1. Parse the code line by line
2. Apply the input data exactly as it would be read by the program
3. Execute each statement in order
4. Track all variable assignments and operations
5. Capture exact output from print/console statements
6. Check for runtime errors (type errors, division by zero, index bounds, etc.)
7. Compare actual output with expected: "${testCase.expected_output}"

OUTPUT REQUIREMENTS:
- Match exact formatting (spaces, newlines, capitalization)
- Include only what the program would actually print
- Be precise with numerical outputs (no extra decimals)
- Handle string outputs exactly as printed

RESPOND WITH VALID JSON ONLY:
{
  "actual_output": "exactly what the code prints to console",
  "passes": true/false based on actual_output === expected_output,
  "execution_trace": "brief step-by-step execution summary",
  "has_runtime_error": false,
  "runtime_error": ""
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
        "model": "deepseek/deepseek-r1-0528:free",
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
    
    // Handle empty responses
    if (!resultText || resultText.length === 0) {
      console.error('Empty response from OpenRouter API');
      throw new Error('AI returned empty response');
    }
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonText = resultText;
    
    // Remove markdown code blocks if present
    if (resultText.includes('```json')) {
      const jsonMatch = resultText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
    } else if (resultText.includes('```')) {
      const jsonMatch = resultText.match(/```\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
    } else {
      // Try to find JSON object in the response
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
    }
    
    let aiResult;
    try {
      aiResult = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', resultText);
      console.error('Extracted JSON text:', jsonText);
      throw new Error(`AI returned invalid JSON response: ${parseError.message}`);
    }
    
    // Validate required fields and normalize response
    if (typeof aiResult.actual_output === 'undefined') {
      aiResult.actual_output = '';
    }
    
    if (typeof aiResult.passes === 'undefined') {
      // Auto-determine pass status by comparing outputs
      const actualOutput = String(aiResult.actual_output).trim();
      const expectedOutput = String(testCase.expected_output).trim();
      aiResult.passes = actualOutput === expectedOutput;
    }
    
    // Ensure boolean type for passes
    aiResult.passes = Boolean(aiResult.passes);
    
    // Validate critical fields
    if (typeof aiResult.actual_output === 'undefined') {
      console.error('Invalid AI result structure:', aiResult);
      throw new Error('AI response missing actual_output field');
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
