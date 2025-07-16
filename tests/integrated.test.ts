import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { ConfigManager } from '../src/config-manager';
import { FileManager } from '../src/file-manager';
import { SUPPORTED_MODELS, SUPPORTED_SIZES } from '../src/types';
import { createMockImageMetadata, createMockBase64Image } from './setup';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    access: jest.fn(),
    readdir: jest.fn(),
    unlink: jest.fn(),
  }
}));

// Mock path module
jest.mock('path', () => ({
  join: jest.fn()
}));

// Mock os module
jest.mock('os', () => ({
  homedir: jest.fn()
}));

// Mock OpenAI
jest.mock('openai', () => ({
  default: jest.fn().mockImplementation(() => ({
    responses: {
      create: jest.fn()
    }
  }))
}));

describe('Integrated Tests', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockPath = join as jest.MockedFunction<typeof join>;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHomedir.mockReturnValue('/home/user');
    mockPath.mockImplementation((...args) => args.join('/'));
    
    // Mock process.cwd
    const originalCwd = process.cwd;
    process.cwd = jest.fn().mockReturnValue('/test');
  });

  describe('ConfigManager Integration', () => {
    let configManager: ConfigManager;

    beforeEach(() => {
      configManager = new ConfigManager();
    });

    it('should provide complete configuration workflow', async () => {
      // Test loading non-existent config (creates default)
      mockFs.readFile.mockRejectedValue(new Error('File not found'));
      mockFs.writeFile.mockResolvedValue();
      mockFs.mkdir.mockResolvedValue(undefined);

      const config = await configManager.loadConfig();
      
      expect(config.model).toBe('gpt-4.1');
      expect(config.defaultSize).toBe('1024x1024');
      expect(config.defaultQuality).toBe('standard');
      expect(config.defaultFormat).toBe('png');
      expect(config.createdAt).toBeDefined();
      expect(config.updatedAt).toBeDefined();

      // Test updating API key
      await configManager.updateApiKey('sk-test-key', 'test-org');
      
      // Check the second call for API key update
      const apiKeyCall = mockFs.writeFile.mock.calls[1];
      expect(apiKeyCall[0]).toBe('/home/user/.mcp-openai-image.json');
      expect(apiKeyCall[1]).toContain('"apiKey": "sk-test-key"');

      // Test configuration status
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        apiKey: 'sk-test-key',
        organization: 'test-org',
        model: 'gpt-4.1',
        defaultSize: '1024x1024',
        defaultQuality: 'standard',
        defaultFormat: 'png',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      }));

      const status = await configManager.getConfigStatus();
      expect(status.configured).toBe(true);
      expect(status.hasApiKey).toBe(true);
      expect(status.model).toBe('gpt-4.1');
      expect(status.organization).toBe('test-org');
    });

    it('should validate API keys correctly', async () => {
      expect(await configManager.validateApiKey('sk-test-key')).toBe(true);
      expect(await configManager.validateApiKey('invalid-key')).toBe(false);
      expect(await configManager.validateApiKey('')).toBe(false);
      expect(await configManager.validateApiKey(null as any)).toBe(false);
    });

    it('should handle model updates', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        model: 'gpt-4.1',
        defaultSize: '1024x1024',
        defaultQuality: 'standard',
        defaultFormat: 'png',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      }));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue();

      await configManager.updateModel('gpt-4.1');
      
      const modelCall = mockFs.writeFile.mock.calls[0];
      expect(modelCall[0]).toBe('/home/user/.mcp-openai-image.json');
      expect(modelCall[1]).toContain('"model": "gpt-4.1"');
    });

    it('should reject invalid models', async () => {
      await expect(configManager.updateModel('invalid-model')).rejects.toThrow('Unsupported model');
    });

    it('should handle getter methods', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        apiKey: 'sk-test-key',
        organization: 'test-org',
        model: 'gpt-4.1',
        defaultSize: '1024x1536',
        defaultQuality: 'standard',
        defaultFormat: 'jpeg',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      }));

      expect(await configManager.getApiKey()).toBe('sk-test-key');
      expect(await configManager.getOrganization()).toBe('test-org');
      expect(await configManager.getModel()).toBe('gpt-4.1');
      expect(await configManager.getDefaultSize()).toBe('1024x1536');
      expect(await configManager.getDefaultQuality()).toBe('standard');
      expect(await configManager.getDefaultFormat()).toBe('jpeg');
    });
  });

  describe('FileManager Integration', () => {
    let fileManager: FileManager;

    beforeEach(() => {
      fileManager = new FileManager();
    });

    it('should provide complete file management workflow', async () => {
      const base64Data = createMockBase64Image();
      const metadata = createMockImageMetadata();
      
      mockFs.writeFile.mockResolvedValue();
      
      const result = await fileManager.saveImageToDesktop(base64Data, 'png', metadata);

      expect(result).toMatch(/\/home\/user\/Desktop\/openai-image-.*\.png/);
      expect(mockFs.writeFile).toHaveBeenCalledTimes(1); // Only image, no metadata
      
      // Check that image buffer was written
      const imageCall = mockFs.writeFile.mock.calls[0];
      expect(imageCall[0]).toMatch(/\.png$/);
      expect(imageCall[1]).toBeInstanceOf(Buffer);
    });

    it('should generate unique filenames', async () => {
      const filename1 = await fileManager.generateUniqueFilename('png');
      const filename2 = await fileManager.generateUniqueFilename('png');
      
      expect(filename1).toMatch(/^openai-image-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-z0-9]{6}\.png$/);
      expect(filename2).toMatch(/^openai-image-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-z0-9]{6}\.png$/);
      expect(filename1).not.toBe(filename2);
    });

    it('should handle different image formats', async () => {
      expect(await fileManager.generateUniqueFilename('jpeg')).toMatch(/\.jpg$/);
      expect(await fileManager.generateUniqueFilename('png')).toMatch(/\.png$/);
      expect(await fileManager.generateUniqueFilename('webp')).toMatch(/\.webp$/);
    });

    it('should validate formats correctly', () => {
      expect(fileManager.validateFormat('png')).toBe(true);
      expect(fileManager.validateFormat('jpeg')).toBe(true);
      expect(fileManager.validateFormat('webp')).toBe(true);
      expect(fileManager.validateFormat('PNG')).toBe(true);
      expect(fileManager.validateFormat('gif')).toBe(false);
      expect(fileManager.validateFormat('')).toBe(false);
    });

    it('should return correct file extensions', () => {
      expect(fileManager.getFileExtension('png')).toBe('png');
      expect(fileManager.getFileExtension('jpeg')).toBe('jpg');
      expect(fileManager.getFileExtension('webp')).toBe('webp');
      expect(fileManager.getFileExtension('unknown')).toBe('png');
    });

    it('should handle desktop operations', async () => {
      expect(fileManager.getDesktopPath()).toBe('/home/user/Desktop');
      
      // Test desktop access
      mockFs.access.mockResolvedValue();
      await expect(fileManager.ensureDesktopExists()).resolves.toBeUndefined();
      
      mockFs.access.mockRejectedValue(new Error('Not found'));
      await expect(fileManager.ensureDesktopExists()).rejects.toThrow('Desktop directory not accessible');
    });

    it('should check disk space', async () => {
      mockFs.writeFile.mockResolvedValue();
      mockFs.unlink.mockResolvedValue();
      
      expect(await fileManager.checkDiskSpace()).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalledWith('/home/user/Desktop/.mcp-test', 'test');
      expect(mockFs.unlink).toHaveBeenCalledWith('/home/user/Desktop/.mcp-test');
      
      mockFs.writeFile.mockRejectedValue(new Error('Disk full'));
      expect(await fileManager.checkDiskSpace()).toBe(false);
    });

    it('should manage image history', async () => {
      mockFs.readdir.mockResolvedValue([
        'openai-image-2023-01-03T00-00-00-000Z-abc123.png',
        'openai-image-2023-01-01T00-00-00-000Z-def456.jpg',
        'other-file.txt',
        'openai-image-2023-01-02T00-00-00-000Z-ghi789.webp'
      ] as any);
      
      const history = await fileManager.getImageHistory();
      
      expect(history).toHaveLength(3);
      expect(history[0]).toContain('2023-01-03T00-00-00-000Z-abc123.png');
      expect(history[1]).toContain('2023-01-02T00-00-00-000Z-ghi789.webp');
      expect(history[2]).toContain('2023-01-01T00-00-00-000Z-def456.jpg');
    });

    it('should cleanup old images', async () => {
      mockFs.readdir.mockResolvedValue([
        'openai-image-2023-01-05T00-00-00-000Z-abc123.png',
        'openai-image-2023-01-04T00-00-00-000Z-def456.jpg',
        'openai-image-2023-01-03T00-00-00-000Z-ghi789.webp',
        'openai-image-2023-01-02T00-00-00-000Z-jkl012.png',
        'openai-image-2023-01-01T00-00-00-000Z-mno345.jpg'
      ] as any);
      mockFs.unlink.mockResolvedValue();
      
      await fileManager.cleanupOldImages(3);
      
      // Should delete 2 oldest images (no metadata files anymore)
      expect(mockFs.unlink).toHaveBeenCalledTimes(2);
    });

    // Metadata loading removed - no longer supported
  });

  describe('Types and Constants', () => {
    it('should have correct supported models', () => {
      expect(SUPPORTED_MODELS).toEqual([
        'gpt-4.1',
        'gpt-4.1-mini',
        'gpt-4o',
        'gpt-4o-mini'
      ]);
    });

    it('should have correct supported sizes', () => {
      expect(SUPPORTED_SIZES).toEqual([
        '1024x1024',
        '1024x1792',
        '1792x1024'
      ]);
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      const configManager = new ConfigManager();
      
      // Test save config failure
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));
      
      await expect(configManager.saveConfig({
        model: 'gpt-4.1',
        defaultSize: '1024x1024',
        defaultQuality: 'standard',
        defaultFormat: 'png',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      })).rejects.toThrow('Failed to save configuration');
    });

    it('should handle file manager errors gracefully', async () => {
      const fileManager = new FileManager();
      const metadata = createMockImageMetadata();
      
      // Test save image failure
      mockFs.writeFile.mockRejectedValue(new Error('Disk full'));
      
      await expect(fileManager.saveImageToDesktop(
        createMockBase64Image(),
        'png',
        metadata
      )).rejects.toThrow('Failed to save image to desktop');
    });

    // Metadata save removed - no longer supported
  });
});