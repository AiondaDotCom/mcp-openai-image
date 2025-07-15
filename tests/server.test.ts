import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { MCPImageServer } from '../src/server';
import { SUPPORTED_MODELS } from '../src/types';

// Mock the MCP SDK
const mockServer = {
  setRequestHandler: jest.fn(),
  connect: jest.fn()
};

jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn().mockImplementation(() => mockServer)
}));

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn().mockImplementation(() => ({}))
}));

// Mock manager classes
const mockConfigManager = {
  getConfigStatus: jest.fn(),
  updateApiKey: jest.fn(),
  updateModel: jest.fn(),
  getModel: jest.fn()
};

const mockFileManager = {
  ensureDesktopExists: jest.fn(),
  checkDiskSpace: jest.fn(),
  cleanupOldImages: jest.fn()
};

const mockImageGenerator = {
  generateImage: jest.fn(),
  editImage: jest.fn(),
  streamImage: jest.fn()
};

// Mock the modules
jest.mock('../src/config-manager', () => ({
  ConfigManager: jest.fn().mockImplementation(() => mockConfigManager)
}));

jest.mock('../src/file-manager', () => ({
  FileManager: jest.fn().mockImplementation(() => mockFileManager)
}));

jest.mock('../src/image-generator', () => ({
  ImageGenerator: jest.fn().mockImplementation(() => mockImageGenerator)
}));

describe('MCPImageServer', () => {
  let server: MCPImageServer;
  let listToolsHandler: any;
  let callToolHandler: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock returns
    mockConfigManager.getConfigStatus.mockResolvedValue({
      configured: true,
      hasApiKey: true,
      model: 'gpt-4.1-mini'
    });
    mockConfigManager.getModel.mockResolvedValue('gpt-4.1-mini');
    mockFileManager.ensureDesktopExists.mockResolvedValue();
    mockFileManager.checkDiskSpace.mockResolvedValue(true);
    mockFileManager.cleanupOldImages.mockResolvedValue();
    
    server = new MCPImageServer();
    
    // Capture the handlers
    const setRequestHandlerCalls = mockServer.setRequestHandler.mock.calls;
    listToolsHandler = setRequestHandlerCalls.find(call => call[0].method === 'tools/list')[1];
    callToolHandler = setRequestHandlerCalls.find(call => call[0].method === 'tools/call')[1];
  });

  describe('constructor', () => {
    it('should initialize server with correct configuration', () => {
      expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('listTools', () => {
    it('should return all available tools', async () => {
      const request = { method: 'tools/list', params: {} };
      const result = await listToolsHandler(request);
      
      expect(result.tools).toHaveLength(6);
      expect(result.tools.map((t: any) => t.name)).toEqual([
        'generate-image',
        'configure-server',
        'edit-image',
        'stream-image',
        'get-config-status',
        'list-supported-models'
      ]);
    });

    it('should include correct tool schemas', async () => {
      const request = { method: 'tools/list', params: {} };
      const result = await listToolsHandler(request);
      
      const generateTool = result.tools.find((t: any) => t.name === 'generate-image');
      expect(generateTool.inputSchema.properties.prompt).toBeDefined();
      expect(generateTool.inputSchema.properties.size).toBeDefined();
      expect(generateTool.inputSchema.required).toEqual(['prompt']);
    });
  });

  describe('callTool - generate-image', () => {
    it('should handle successful image generation', async () => {
      mockImageGenerator.generateImage.mockResolvedValue({
        success: true,
        filePath: '/home/user/Desktop/test-image.png',
        fileName: 'test-image.png',
        responseId: 'test-response-id',
        imageId: 'test-image-id',
        revisedPrompt: 'revised test prompt',
        metadata: {
          prompt: 'test prompt',
          size: '1024x1024',
          quality: 'auto',
          format: 'png',
          model: 'gpt-4.1-mini'
        }
      });
      
      const request = {
        method: 'tools/call',
        params: {
          name: 'generate-image',
          arguments: {
            prompt: 'test prompt',
            size: '1024x1024',
            quality: 'auto',
            format: 'png'
          }
        }
      };
      
      const result = await callToolHandler(request);
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Image generated successfully!');
      expect(result.content[0].text).toContain('test-image.png');
      expect(result.content[0].text).toContain('1024x1024');
      expect(result.isError).toBeUndefined();
    });

    it('should handle image generation failure', async () => {
      mockImageGenerator.generateImage.mockResolvedValue({
        success: false,
        error: {
          code: 'GENERATION_FAILED',
          message: 'API key not configured',
          suggestions: ['Check your API key', 'Verify your prompt']
        }
      });
      
      const request = {
        method: 'tools/call',
        params: {
          name: 'generate-image',
          arguments: {
            prompt: 'test prompt'
          }
        }
      };
      
      const result = await callToolHandler(request);
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Failed to generate image');
      expect(result.content[0].text).toContain('API key not configured');
      expect(result.content[0].text).toContain('Check your API key');
      expect(result.isError).toBe(true);
    });

    it('should validate input parameters', async () => {
      const request = {
        method: 'tools/call',
        params: {
          name: 'generate-image',
          arguments: {
            prompt: 'test prompt',
            size: 'invalid-size'
          }
        }
      };
      
      const result = await callToolHandler(request);
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Error:');
      expect(result.isError).toBe(true);
    });
  });

  describe('callTool - configure-server', () => {
    it('should handle successful configuration', async () => {
      mockConfigManager.updateApiKey.mockResolvedValue();
      mockConfigManager.updateModel.mockResolvedValue();
      
      const request = {
        method: 'tools/call',
        params: {
          name: 'configure-server',
          arguments: {
            apiKey: 'sk-test-key',
            organization: 'test-org',
            model: 'gpt-4.1'
          }
        }
      };
      
      const result = await callToolHandler(request);
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Server configured successfully!');
      expect(result.content[0].text).toContain('sk-test-key'.substring(0, 10));
      expect(result.content[0].text).toContain('test-org');
      expect(result.isError).toBeUndefined();
      
      expect(mockConfigManager.updateApiKey).toHaveBeenCalledWith('sk-test-key', 'test-org');
      expect(mockConfigManager.updateModel).toHaveBeenCalledWith('gpt-4.1');
    });

    it('should handle configuration failure', async () => {
      mockConfigManager.updateApiKey.mockRejectedValue(new Error('Invalid API key'));
      
      const request = {
        method: 'tools/call',
        params: {
          name: 'configure-server',
          arguments: {
            apiKey: 'invalid-key'
          }
        }
      };
      
      const result = await callToolHandler(request);
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Failed to configure server');
      expect(result.content[0].text).toContain('Invalid API key');
      expect(result.isError).toBe(true);
    });

    it('should validate required parameters', async () => {
      const request = {
        method: 'tools/call',
        params: {
          name: 'configure-server',
          arguments: {
            organization: 'test-org'
          }
        }
      };
      
      const result = await callToolHandler(request);
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Error:');
      expect(result.isError).toBe(true);
    });
  });

  describe('callTool - edit-image', () => {
    it('should handle successful image editing', async () => {
      mockImageGenerator.editImage.mockResolvedValue({
        success: true,
        filePath: '/home/user/Desktop/edited-image.png',
        fileName: 'edited-image.png',
        responseId: 'edit-response-id',
        imageId: 'edit-image-id',
        revisedPrompt: 'revised edit prompt'
      });
      
      const request = {
        method: 'tools/call',
        params: {
          name: 'edit-image',
          arguments: {
            editPrompt: 'make it brighter',
            previousResponseId: 'previous-response-id'
          }
        }
      };
      
      const result = await callToolHandler(request);
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Image edited successfully!');
      expect(result.content[0].text).toContain('edited-image.png');
      expect(result.content[0].text).toContain('make it brighter');
      expect(result.isError).toBeUndefined();
    });

    it('should handle edit failure', async () => {
      mockImageGenerator.editImage.mockResolvedValue({
        success: false,
        error: {
          code: 'EDIT_FAILED',
          message: 'Invalid response ID',
          suggestions: ['Check your response ID']
        }
      });
      
      const request = {
        method: 'tools/call',
        params: {
          name: 'edit-image',
          arguments: {
            editPrompt: 'make it brighter',
            previousResponseId: 'invalid-id'
          }
        }
      };
      
      const result = await callToolHandler(request);
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Failed to edit image');
      expect(result.content[0].text).toContain('Invalid response ID');
      expect(result.isError).toBe(true);
    });
  });

  describe('callTool - stream-image', () => {
    it('should handle successful image streaming', async () => {
      mockImageGenerator.streamImage.mockResolvedValue({
        success: true,
        finalImagePath: '/home/user/Desktop/final-image.png',
        partialImagePaths: [
          '/home/user/Desktop/partial-0.png',
          '/home/user/Desktop/partial-1.png'
        ],
        responseId: 'stream-response-id',
        revisedPrompt: 'revised stream prompt'
      });
      
      const request = {
        method: 'tools/call',
        params: {
          name: 'stream-image',
          arguments: {
            prompt: 'test prompt',
            partialImages: 2
          }
        }
      };
      
      const result = await callToolHandler(request);
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Image streamed successfully!');
      expect(result.content[0].text).toContain('final-image.png');
      expect(result.content[0].text).toContain('partial-0.png');
      expect(result.content[0].text).toContain('Partial images: 2');
      expect(result.isError).toBeUndefined();
    });
  });

  describe('callTool - get-config-status', () => {
    it('should return configured status', async () => {
      mockConfigManager.getConfigStatus.mockResolvedValue({
        configured: true,
        hasApiKey: true,
        model: 'gpt-4.1-mini',
        organization: 'test-org',
        lastUsed: '2023-01-01T00:00:00.000Z'
      });
      
      const request = {
        method: 'tools/call',
        params: {
          name: 'get-config-status',
          arguments: {}
        }
      };
      
      const result = await callToolHandler(request);
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Configuration Status:');
      expect(result.content[0].text).toContain('Configured: Yes');
      expect(result.content[0].text).toContain('Has API Key: Yes');
      expect(result.content[0].text).toContain('Model: gpt-4.1-mini');
      expect(result.content[0].text).toContain('Organization: test-org');
      expect(result.content[0].text).toContain('Ready to generate images!');
      expect(result.isError).toBeUndefined();
    });

    it('should return not configured status', async () => {
      mockConfigManager.getConfigStatus.mockResolvedValue({
        configured: false,
        hasApiKey: false,
        model: 'gpt-4.1-mini'
      });
      
      const request = {
        method: 'tools/call',
        params: {
          name: 'get-config-status',
          arguments: {}
        }
      };
      
      const result = await callToolHandler(request);
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Configured: No');
      expect(result.content[0].text).toContain('Has API Key: No');
      expect(result.content[0].text).toContain('Please configure the server');
      expect(result.isError).toBeUndefined();
    });
  });

  describe('callTool - list-supported-models', () => {
    it('should return supported models', async () => {
      const request = {
        method: 'tools/call',
        params: {
          name: 'list-supported-models',
          arguments: {}
        }
      };
      
      const result = await callToolHandler(request);
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Supported Models:');
      expect(result.content[0].text).toContain('● gpt-4.1-mini'); // Current model
      expect(result.content[0].text).toContain('Current Model: gpt-4.1-mini');
      expect(result.content[0].text).toContain('Image Generation Model: gpt-image-1');
      
      // Check all supported models are listed
      for (const model of SUPPORTED_MODELS) {
        expect(result.content[0].text).toContain(model);
      }
      
      expect(result.isError).toBeUndefined();
    });
  });

  describe('callTool - unknown tool', () => {
    it('should handle unknown tool', async () => {
      const request = {
        method: 'tools/call',
        params: {
          name: 'unknown-tool',
          arguments: {}
        }
      };
      
      const result = await callToolHandler(request);
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Error: Unknown tool: unknown-tool');
      expect(result.isError).toBe(true);
    });
  });

  describe('run', () => {
    it('should initialize and run server', async () => {
      mockFileManager.ensureDesktopExists.mockResolvedValue();
      mockFileManager.checkDiskSpace.mockResolvedValue(true);
      mockFileManager.cleanupOldImages.mockResolvedValue();
      mockConfigManager.getConfigStatus.mockResolvedValue({
        configured: true,
        hasApiKey: true,
        model: 'gpt-4.1-mini'
      });
      
      await server.run();
      
      expect(mockFileManager.ensureDesktopExists).toHaveBeenCalled();
      expect(mockFileManager.checkDiskSpace).toHaveBeenCalled();
      expect(mockFileManager.cleanupOldImages).toHaveBeenCalledWith(50);
      expect(mockConfigManager.getConfigStatus).toHaveBeenCalled();
      expect(mockServer.connect).toHaveBeenCalled();
    });

    it('should handle desktop access issues', async () => {
      mockFileManager.ensureDesktopExists.mockRejectedValue(new Error('Desktop not found'));
      mockFileManager.checkDiskSpace.mockResolvedValue(false);
      
      await server.run();
      
      expect(mockServer.connect).toHaveBeenCalled();
    });
  });
});