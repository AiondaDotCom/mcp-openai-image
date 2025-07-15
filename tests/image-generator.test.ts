import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ImageGenerator } from '../src/image-generator';
import { ConfigManager } from '../src/config-manager';
import { FileManager } from '../src/file-manager';
import { 
  createMockImageMetadata, 
  createMockBase64Image, 
  createMockOpenAIResponse,
  createMockStreamEvents 
} from './setup';

// Mock OpenAI
const mockOpenAI = {
  images: {
    generate: jest.fn()
  }
};

jest.mock('openai', () => ({
  default: jest.fn().mockImplementation(() => mockOpenAI)
}));

// Mock the manager classes
const mockConfigManager = {
  getApiKey: jest.fn(),
  getOrganization: jest.fn(),
  getModel: jest.fn(),
  getDefaultSize: jest.fn(),
  getDefaultQuality: jest.fn(),
  getDefaultFormat: jest.fn(),
  updateLastUsed: jest.fn()
};

const mockFileManager = {
  saveImageToDesktop: jest.fn()
};

describe('ImageGenerator', () => {
  let imageGenerator: ImageGenerator;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock returns
    mockConfigManager.getApiKey.mockResolvedValue('sk-test-key');
    mockConfigManager.getOrganization.mockResolvedValue('test-org');
    mockConfigManager.getModel.mockResolvedValue('gpt-4.1-mini');
    mockConfigManager.getDefaultSize.mockResolvedValue('1024x1024');
    mockConfigManager.getDefaultQuality.mockResolvedValue('auto');
    mockConfigManager.getDefaultFormat.mockResolvedValue('png');
    mockConfigManager.updateLastUsed.mockResolvedValue();
    
    mockFileManager.saveImageToDesktop.mockResolvedValue('/home/user/Desktop/test-image.png');
    
    imageGenerator = new ImageGenerator(
      mockConfigManager as any,
      mockFileManager as any
    );
  });

  describe('generateImage', () => {
    it('should generate image successfully', async () => {
      const mockResponse = createMockOpenAIResponse();
      mockOpenAI.images.generate.mockResolvedValue(mockResponse);
      
      const params = {
        prompt: 'test prompt',
        size: '1024x1024',
        quality: 'auto',
        format: 'png'
      };
      
      const result = await imageGenerator.generateImage(params);
      
      expect(result.success).toBe(true);
      expect(result.filePath).toBe('/home/user/Desktop/test-image.png');
      expect(result.responseId).toBe('test-response-id');
      expect(result.imageId).toBe('test-image-id');
      expect(result.revisedPrompt).toBe('revised test prompt');
      
      expect(mockOpenAI.images.generate).toHaveBeenCalledWith({
        model: 'dall-e-3',
        prompt: 'test prompt',
        size: '1024x1024',
        quality: 'standard',
        n: 1,
        response_format: 'b64_json'
      });
      
      expect(mockFileManager.saveImageToDesktop).toHaveBeenCalledWith(
        createMockBase64Image(),
        'png',
        expect.objectContaining({
          prompt: 'test prompt',
          revisedPrompt: 'revised test prompt',
          size: '1024x1024',
          quality: 'auto',
          format: 'png'
        })
      );
      
      expect(mockConfigManager.updateLastUsed).toHaveBeenCalled();
    });

    it('should use default parameters when not provided', async () => {
      const mockResponse = createMockOpenAIResponse();
      mockOpenAI.images.generate.mockResolvedValue(mockResponse);
      
      const params = {
        prompt: 'test prompt'
      };
      
      const result = await imageGenerator.generateImage(params);
      
      expect(result.success).toBe(true);
      expect(mockOpenAI.images.generate).toHaveBeenCalledWith({
        model: 'dall-e-3',
        prompt: 'test prompt',
        size: '1024x1024',
        quality: 'standard',
        n: 1,
        response_format: 'b64_json'
      });
    });

    it('should handle API key not configured', async () => {
      mockConfigManager.getApiKey.mockResolvedValue(undefined);
      
      const params = {
        prompt: 'test prompt'
      };
      
      const result = await imageGenerator.generateImage(params);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('GENERATION_FAILED');
      expect(result.error?.message).toContain('OpenAI API key not configured');
    });

    it('should handle OpenAI API error', async () => {
      mockOpenAI.images.generate.mockRejectedValue(new Error('API rate limit exceeded'));
      
      const params = {
        prompt: 'test prompt'
      };
      
      const result = await imageGenerator.generateImage(params);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('GENERATION_FAILED');
      expect(result.error?.message).toContain('API rate limit exceeded');
      expect(result.error?.suggestions).toContain('Try again later');
    });

    it('should handle no image in response', async () => {
      const mockResponse = {
        id: 'test-response-id',
        output: []
      };
      mockOpenAI.images.generate.mockResolvedValue(mockResponse);
      
      const params = {
        prompt: 'test prompt'
      };
      
      const result = await imageGenerator.generateImage(params);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('No image generated in response');
    });

    it('should validate parameters', async () => {
      const params = {
        prompt: 'test prompt',
        size: 'invalid-size' as any
      };
      
      const result = await imageGenerator.generateImage(params);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Unsupported size');
    });

    it('should handle compression parameter', async () => {
      const mockResponse = createMockOpenAIResponse();
      mockOpenAI.images.generate.mockResolvedValue(mockResponse);
      
      const params = {
        prompt: 'test prompt',
        compression: 85
      };
      
      const result = await imageGenerator.generateImage(params);
      
      expect(result.success).toBe(true);
      expect(mockOpenAI.images.generate).toHaveBeenCalledWith({
        model: 'dall-e-3',
        prompt: 'test prompt',
        size: '1024x1024',
        quality: 'standard',
        n: 1,
        response_format: 'b64_json'
      });
    });

    it('should validate compression parameter', async () => {
      const params = {
        prompt: 'test prompt',
        compression: 150
      };
      
      const result = await imageGenerator.generateImage(params);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Compression must be between 0 and 100');
    });
  });

  describe('editImage', () => {
    it('should edit image using previous response ID', async () => {
      const mockResponse = createMockOpenAIResponse();
      mockOpenAI.images.generate.mockResolvedValue(mockResponse);
      
      const params = {
        editPrompt: 'make it brighter',
        previousResponseId: 'previous-response-id'
      };
      
      const result = await imageGenerator.editImage(params);
      
      expect(result.success).toBe(true);
      expect(result.filePath).toBe('/home/user/Desktop/test-image.png');
      
      expect(mockOpenAI.images.generate).toHaveBeenCalledWith({
        model: 'dall-e-3',
        prompt: 'make it brighter',
        size: '1024x1024',
        quality: 'standard',
        n: 1,
        response_format: 'b64_json'
      });
    });

    it('should edit image using image ID', async () => {
      const mockResponse = createMockOpenAIResponse();
      mockOpenAI.images.generate.mockResolvedValue(mockResponse);
      
      const params = {
        editPrompt: 'make it brighter',
        imageId: 'image-id-123'
      };
      
      const result = await imageGenerator.editImage(params);
      
      expect(result.success).toBe(true);
      expect(mockOpenAI.images.generate).toHaveBeenCalledWith({
        model: 'dall-e-3',
        prompt: 'make it brighter',
        size: '1024x1024',
        quality: 'standard',
        n: 1,
        response_format: 'b64_json'
      });
    });

    it('should require either previousResponseId or imageId', async () => {
      const params = {
        editPrompt: 'make it brighter'
      };
      
      const result = await imageGenerator.editImage(params);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Either previousResponseId or imageId must be provided');
    });

    it('should handle edit errors', async () => {
      mockOpenAI.images.generate.mockRejectedValue(new Error('Edit failed'));
      
      const params = {
        editPrompt: 'make it brighter',
        previousResponseId: 'previous-response-id'
      };
      
      const result = await imageGenerator.editImage(params);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EDIT_FAILED');
      expect(result.error?.message).toContain('Edit failed');
    });
  });

  describe('streamImage', () => {
    it('should stream image generation', async () => {
      const mockStreamEvents = createMockStreamEvents();
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          for (const event of mockStreamEvents) {
            yield event;
          }
        }
      };
      
      mockOpenAI.images.generate.mockResolvedValue(mockStream);
      mockFileManager.saveImageToDesktop
        .mockResolvedValueOnce('/home/user/Desktop/partial-0.png')
        .mockResolvedValueOnce('/home/user/Desktop/partial-1.png')
        .mockResolvedValueOnce('/home/user/Desktop/final.png');
      
      const params = {
        prompt: 'test prompt',
        partialImages: 2
      };
      
      const result = await imageGenerator.streamImage(params);
      
      expect(result.success).toBe(true);
      expect(result.finalImagePath).toBe('/home/user/Desktop/final.png');
      expect(result.partialImagePaths).toHaveLength(2);
      expect(result.responseId).toBe('test-image-id');
      expect(result.revisedPrompt).toBe('revised test prompt');
      
      expect(mockOpenAI.images.generate).toHaveBeenCalledWith({
        model: 'dall-e-3',
        prompt: 'test prompt',
        size: '1024x1024',
        quality: 'standard',
        n: 1,
        response_format: 'b64_json'
      });
      
      expect(mockFileManager.saveImageToDesktop).toHaveBeenCalledTimes(3);
    });

    it('should use default parameters for streaming', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          return;
        }
      };
      
      mockOpenAI.images.generate.mockResolvedValue(mockStream);
      
      const params = {
        prompt: 'test prompt'
      };
      
      const result = await imageGenerator.streamImage(params);
      
      expect(mockOpenAI.images.generate).toHaveBeenCalledWith({
        model: 'dall-e-3',
        prompt: 'test prompt',
        size: '1024x1024',
        quality: 'standard',
        n: 1,
        response_format: 'b64_json'
      });
    });

    it('should validate stream parameters', async () => {
      const params = {
        prompt: 'test prompt',
        partialImages: 5
      };
      
      const result = await imageGenerator.streamImage(params);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Partial images must be between 1 and 3');
    });

    it('should handle streaming errors', async () => {
      mockOpenAI.images.generate.mockRejectedValue(new Error('Stream failed'));
      
      const params = {
        prompt: 'test prompt'
      };
      
      const result = await imageGenerator.streamImage(params);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('STREAM_FAILED');
      expect(result.error?.message).toContain('Stream failed');
    });
  });

  describe('parameter validation', () => {
    it('should validate size parameter', async () => {
      const params = {
        prompt: 'test prompt',
        size: 'invalid-size' as any
      };
      
      const result = await imageGenerator.generateImage(params);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Unsupported size');
    });

    it('should validate quality parameter', async () => {
      const params = {
        prompt: 'test prompt',
        quality: 'invalid-quality' as any
      };
      
      const result = await imageGenerator.generateImage(params);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Unsupported quality');
    });

    it('should validate format parameter', async () => {
      const params = {
        prompt: 'test prompt',
        format: 'invalid-format' as any
      };
      
      const result = await imageGenerator.generateImage(params);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Unsupported format');
    });

    it('should validate background parameter', async () => {
      const params = {
        prompt: 'test prompt',
        background: 'invalid-background' as any
      };
      
      const result = await imageGenerator.generateImage(params);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Unsupported background');
    });
  });

  describe('initialization', () => {
    it('should initialize OpenAI client with API key and organization', async () => {
      const mockResponse = createMockOpenAIResponse();
      mockOpenAI.images.generate.mockResolvedValue(mockResponse);
      
      await imageGenerator.generateImage({ prompt: 'test' });
      
      expect(mockConfigManager.getApiKey).toHaveBeenCalled();
      expect(mockConfigManager.getOrganization).toHaveBeenCalled();
    });

    it('should handle missing API key', async () => {
      mockConfigManager.getApiKey.mockResolvedValue(undefined);
      
      const result = await imageGenerator.generateImage({ prompt: 'test' });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('OpenAI API key not configured');
    });
  });
});