/**
 * @fileoverview Example usage of the LanguageModelQueue for rate-aware model requests
 * 
 * This example demonstrates how to create and use a LanguageModelQueue to manage
 * language model requests with automatic rate limiting and FIFO processing.
 */

import { LanguageModelV1 } from '@ai-sdk/provider';
import { LanguageModelQueue } from '@/lib/ai/services/chat';
import { getAiModelProvider } from '@/lib/ai/aiModelFactory';

/**
 * Example: Basic usage of LanguageModelQueue
 */
async function basicUsageExample() {
  // Get a language model (e.g., GPT-4)
  const model: LanguageModelV1 = getAiModelProvider('gpt-4o');
  
  // Create a queue with a maximum of 3 concurrent requests
  const queue = new LanguageModelQueue({
    model,
    maxConcurrentRequests: 3
  });

  try {
    // Example request parameters
    const requestParams = {
      messages: [
        { role: 'user', content: 'Hello, how are you?' }
      ],
      temperature: 0.7,
      maxTokens: 150
    };

    // Generate text using the queue
    console.log('Sending request through queue...');
    const result = await queue.generateText(requestParams);
    console.log('Received response:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('Request failed:', error);
  } finally {
    // Always dispose of the queue when done
    queue.dispose();
  }
}

/**
 * Example: Using abort signals for request cancellation
 */
async function abortSignalExample() {
  const model: LanguageModelV1 = getAiModelProvider('gpt-4o');
  const queue = new LanguageModelQueue({
    model,
    maxConcurrentRequests: 2
  });

  try {
    // Create an abort controller
    const controller = new AbortController();
    
    // Set up automatic abort after 10 seconds
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.log('Request aborted due to timeout');
    }, 10000);

    const requestParams = {
      messages: [
        { role: 'user', content: 'Write a very long story about space exploration...' }
      ]
    };

    try {
      // Send request with abort signal
      const result = await queue.generateText(requestParams, controller.signal);
      clearTimeout(timeoutId);
      console.log('Request completed successfully:', !!result);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortChatMessageRequestError') {
        console.log('Request was successfully aborted');
      } else {
        throw error;
      }
    }

  } finally {
    queue.dispose();
  }
}

/**
 * Example: Handling multiple concurrent requests
 */
async function concurrentRequestsExample() {
  const model: LanguageModelV1 = getAiModelProvider('gpt-4o-mini');
  const queue = new LanguageModelQueue({
    model,
    maxConcurrentRequests: 2
  });

  try {
    // Create multiple requests
    const requests = [
      'What is the capital of France?',
      'Explain quantum computing in simple terms.',
      'Write a haiku about coding.',
      'What are the benefits of renewable energy?',
      'Describe the water cycle.'
    ].map((prompt, index) => ({
      id: `request-${index}`,
      params: {
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        maxTokens: 100
      }
    }));

    console.log(`Sending ${requests.length} requests to queue...`);
    
    // Send all requests concurrently
    const promises = requests.map(req => 
      queue.generateText(req.params).then(result => ({
        id: req.id,
        success: true,
        result
      })).catch(error => ({
        id: req.id,
        success: false,
        error: error.message
      }))
    );

    // Wait for all requests to complete
    const results = await Promise.all(promises);
    
    // Log results
    results.forEach(result => {
      if (result.success) {
        console.log(`${result.id}: Success`);
      } else {
        console.log(`${result.id}: Failed - ${result.error}`);
      }
    });

  } finally {
    queue.dispose();
  }
}

/**
 * Example: Using different model methods
 */
async function differentMethodsExample() {
  const model: LanguageModelV1 = getAiModelProvider('gpt-4o');
  const queue = new LanguageModelQueue({
    model,
    maxConcurrentRequests: 1
  });

  try {
    // Example 1: Generate structured object
    console.log('Generating structured object...');
    const objectResult = await queue.generateObject({
      messages: [
        { role: 'user', content: 'Create a person profile with name, age, and occupation' }
      ],
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          occupation: { type: 'string' }
        },
        required: ['name', 'age', 'occupation']
      }
    });
    console.log('Object result:', objectResult);

    // Example 2: Stream text response
    console.log('Streaming text response...');
    const streamResult = await queue.streamText({
      messages: [
        { role: 'user', content: 'Count from 1 to 10 slowly' }
      ]
    });
    console.log('Stream result:', streamResult);

  } catch (error) {
    console.error('Error in different methods example:', error);
  } finally {
    queue.dispose();
  }
}

/**
 * Example: Error handling for large messages
 */
async function errorHandlingExample() {
  const model: LanguageModelV1 = getAiModelProvider('gpt-4o');
  const queue = new LanguageModelQueue({
    model,
    maxConcurrentRequests: 1
  });

  try {
    // Create a very large message that exceeds token limits
    const largeContent = 'Tell me about '.repeat(10000) + 'artificial intelligence.';
    
    const requestParams = {
      messages: [
        { role: 'user', content: largeContent }
      ]
    };

    await queue.generateText(requestParams);
    
  } catch (error) {
    if (error.name === 'MessageTooLargeForQueueError') {
      console.log('Message was too large for the queue:');
      console.log(`- Token count: ${error.tokenCount}`);
      console.log(`- Max allowed: ${error.maxTokens}`);
      console.log(`- Model type: ${error.modelType}`);
    } else {
      console.error('Unexpected error:', error);
    }
  } finally {
    queue.dispose();
  }
}

// Export examples for potential usage
export {
  basicUsageExample,
  abortSignalExample,
  concurrentRequestsExample,
  differentMethodsExample,
  errorHandlingExample
};

// Run a basic example if this file is executed directly
if (require.main === module) {
  console.log('Running LanguageModelQueue basic usage example...');
  basicUsageExample()
    .then(() => console.log('Example completed successfully'))
    .catch(error => console.error('Example failed:', error));
}