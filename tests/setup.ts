import { jest } from '@jest/globals';

// Mock console.error to avoid noise in tests
global.console.error = jest.fn();

// Mock process.env for tests
process.env.NODE_ENV = 'test';

// Mock file system paths for tests
export const mockDesktopPath = '/tmp/test-desktop';
export const mockConfigPath = '/tmp/test-config';

// Common test utilities
export const createMockFile = (content: string) => ({
  toString: () => content,
  length: content.length
});

export const createMockImageMetadata = (overrides = {}) => ({
  prompt: 'test prompt',
  revisedPrompt: 'revised test prompt',
  size: '1024x1024',
  quality: 'auto',
  format: 'png',
  model: 'gpt-4.1-mini',
  timestamp: '2023-01-01T00:00:00.000Z',
  responseId: 'test-response-id',
  imageId: 'test-image-id',
  ...overrides
});

export const createMockBase64Image = () => 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

// Mock OpenAI response
export const createMockOpenAIResponse = (overrides = {}) => ({
  data: [{
    b64_json: createMockBase64Image(),
    revised_prompt: 'revised test prompt'
  }],
  ...overrides
});

// Mock stream events
export const createMockStreamEvents = () => [
  {
    type: 'response.image_generation_call.partial_image',
    partial_image_index: 0,
    partial_image_b64: createMockBase64Image()
  },
  {
    type: 'response.image_generation_call.partial_image',
    partial_image_index: 1,
    partial_image_b64: createMockBase64Image()
  },
  {
    type: 'response.image_generation_call.completed',
    id: 'test-image-id',
    revised_prompt: 'revised test prompt',
    result: createMockBase64Image()
  }
];