import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { MCPImageServer } from '../src/server';
import { SUPPORTED_MODELS } from '../src/types';

// Mock the MCP SDK
jest.mock('@modelcontextprotocol/sdk/server/index.js');
jest.mock('@modelcontextprotocol/sdk/server/stdio.js');

// Create mock server instance
const mockServer = {
  setRequestHandler: jest.fn(),
  connect: jest.fn()
};

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

describe('MCPImageServer', () => {
  let server: MCPImageServer;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up Server mock
    const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
    Server.mockImplementation(() => mockServer);
    
    // Setup default mock returns
    mockConfigManager.getConfigStatus.mockResolvedValue({
      configured: true,
      hasApiKey: true,
      model: 'gpt-4.1'
    });
    mockConfigManager.getModel.mockResolvedValue('gpt-4.1');
    mockFileManager.ensureDesktopExists.mockResolvedValue();
    mockFileManager.checkDiskSpace.mockResolvedValue(true);
    mockFileManager.cleanupOldImages.mockResolvedValue();
  });

  describe('constructor', () => {
    it('should initialize server with correct configuration', () => {
      server = new MCPImageServer();
      expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('run', () => {
    it('should initialize and run server', async () => {
      server = new MCPImageServer();
      
      await server.run();
      
      expect(mockFileManager.ensureDesktopExists).toHaveBeenCalled();
      expect(mockFileManager.checkDiskSpace).toHaveBeenCalled();
      expect(mockFileManager.cleanupOldImages).toHaveBeenCalledWith(50);
      expect(mockConfigManager.getConfigStatus).toHaveBeenCalled();
      expect(mockServer.connect).toHaveBeenCalled();
    });

    it('should handle desktop errors gracefully', async () => {
      mockFileManager.ensureDesktopExists.mockRejectedValue(new Error('Desktop not found'));
      mockFileManager.checkDiskSpace.mockResolvedValue(false);
      
      server = new MCPImageServer();
      
      await expect(server.run()).resolves.not.toThrow();
    });

    it('should show warning for unconfigured server', async () => {
      mockConfigManager.getConfigStatus.mockResolvedValue({
        configured: false,
        hasApiKey: false,
        model: 'gpt-4.1'
      });
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      server = new MCPImageServer();
      await server.run();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Configuration status:'),
        expect.any(String)
      );
      
      consoleErrorSpy.mockRestore();
    });
  });
});