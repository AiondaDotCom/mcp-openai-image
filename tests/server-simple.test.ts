import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { SUPPORTED_MODELS } from '../src/types';

// Mock the MCP SDK completely
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn().mockImplementation(() => ({
    setRequestHandler: jest.fn(),
    connect: jest.fn()
  }))
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

jest.mock('../src/config-manager', () => ({
  ConfigManager: jest.fn().mockImplementation(() => mockConfigManager)
}));

jest.mock('../src/file-manager', () => ({
  FileManager: jest.fn().mockImplementation(() => mockFileManager)
}));

jest.mock('../src/image-generator', () => ({
  ImageGenerator: jest.fn().mockImplementation(() => mockImageGenerator)
}));

describe('MCPImageServer - Simple Tests', () => {
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
  });

  it('should have correct supported models', () => {
    expect(SUPPORTED_MODELS).toContain('gpt-4.1-mini');
    expect(SUPPORTED_MODELS).toContain('gpt-4.1');
    expect(SUPPORTED_MODELS).toContain('gpt-4o');
    expect(SUPPORTED_MODELS).toContain('gpt-4o-mini');
  });

  it('should create server instance', async () => {
    const { MCPImageServer } = await import('../src/server');
    const server = new MCPImageServer();
    expect(server).toBeDefined();
  });

  it('should handle run method', async () => {
    const { MCPImageServer } = await import('../src/server');
    const server = new MCPImageServer();
    
    await server.run();
    
    expect(mockFileManager.ensureDesktopExists).toHaveBeenCalled();
    expect(mockFileManager.checkDiskSpace).toHaveBeenCalled();
    expect(mockFileManager.cleanupOldImages).toHaveBeenCalledWith(50);
    expect(mockConfigManager.getConfigStatus).toHaveBeenCalled();
  });

  it('should handle desktop access issues gracefully', async () => {
    mockFileManager.ensureDesktopExists.mockRejectedValue(new Error('Desktop not found'));
    mockFileManager.checkDiskSpace.mockResolvedValue(false);
    
    const { MCPImageServer } = await import('../src/server');
    const server = new MCPImageServer();
    
    await expect(server.run()).resolves.not.toThrow();
  });
});