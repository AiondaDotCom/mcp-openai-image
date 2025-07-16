import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { ConfigManager } from '../src/config-manager';
import { mockConfigPath } from './setup';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
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

// Mock process.cwd
const originalCwd = process.cwd;
const mockCwd = jest.fn();

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockPath = join as jest.MockedFunction<typeof join>;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.cwd = mockCwd;
    mockCwd.mockReturnValue('/test');
    mockHomedir.mockReturnValue('/home/testuser');
    mockPath.mockImplementation((...args) => {
      if (args.length === 2 && args[0] === '/home/testuser' && args[1] === '.mcp-openai-image.json') {
        return '/home/testuser/.mcp-openai-image.json';
      }
      return args.join('/');
    });
    configManager = new ConfigManager();
  });

  afterEach(() => {
    process.cwd = originalCwd;
  });

  describe('loadConfig', () => {
    it('should load existing config file', async () => {
      const mockConfig = {
        apiKey: 'sk-test-key',
        model: 'gpt-4.1-mini',
        defaultSize: '1024x1024',
        defaultQuality: 'auto',
        defaultFormat: 'png',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockConfig));

      const result = await configManager.loadConfig();

      expect(result).toEqual(mockConfig);
      expect(mockFs.readFile).toHaveBeenCalledWith('/home/testuser/.mcp-openai-image.json', 'utf-8');
    });

    it('should create default config when file does not exist', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));
      mockFs.writeFile.mockResolvedValue();

      const result = await configManager.loadConfig();

      expect(result.model).toBe('gpt-4.1');
      expect(result.defaultSize).toBe('1024x1024');
      expect(result.defaultQuality).toBe('auto');
      expect(result.defaultFormat).toBe('png');
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should return cached config on subsequent calls', async () => {
      const mockConfig = {
        apiKey: 'sk-test-key',
        model: 'gpt-4.1-mini',
        defaultSize: '1024x1024',
        defaultQuality: 'auto',
        defaultFormat: 'png',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockConfig));

      await configManager.loadConfig();
      await configManager.loadConfig();

      expect(mockFs.readFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('saveConfig', () => {
    it('should save config to file', async () => {
      const config = {
        apiKey: 'sk-test-key',
        model: 'gpt-4.1-mini',
        defaultSize: '1024x1024',
        defaultQuality: 'auto',
        defaultFormat: 'png',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      };

      mockFs.writeFile.mockResolvedValue();

      await configManager.saveConfig(config);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/home/testuser/.mcp-openai-image.json',
        expect.stringContaining('"apiKey": "sk-test-key"')
      );
    });

    it('should update updatedAt timestamp', async () => {
      const config = {
        apiKey: 'sk-test-key',
        model: 'gpt-4.1-mini',
        defaultSize: '1024x1024',
        defaultQuality: 'auto',
        defaultFormat: 'png',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      };

      mockFs.writeFile.mockResolvedValue();

      await configManager.saveConfig(config);

      expect(config.updatedAt).not.toBe('2023-01-01T00:00:00.000Z');
    });

    it('should throw error if save fails', async () => {
      const config = {
        apiKey: 'sk-test-key',
        model: 'gpt-4.1-mini',
        defaultSize: '1024x1024',
        defaultQuality: 'auto',
        defaultFormat: 'png',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      };

      mockFs.writeFile.mockRejectedValue(new Error('Permission denied'));

      await expect(configManager.saveConfig(config)).rejects.toThrow('Failed to save configuration');
    });
  });

  describe('validateApiKey', () => {
    it('should return true for valid API key', async () => {
      const result = await configManager.validateApiKey('sk-test-key-123');
      expect(result).toBe(true);
    });

    it('should return false for invalid API key format', async () => {
      expect(await configManager.validateApiKey('invalid-key')).toBe(false);
      expect(await configManager.validateApiKey('')).toBe(false);
      expect(await configManager.validateApiKey('test-key')).toBe(false);
    });

    it('should return false for non-string input', async () => {
      expect(await configManager.validateApiKey(null as any)).toBe(false);
      expect(await configManager.validateApiKey(undefined as any)).toBe(false);
      expect(await configManager.validateApiKey(123 as any)).toBe(false);
    });
  });

  describe('getConfigStatus', () => {
    it('should return configured status when API key exists', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        apiKey: 'sk-test-key',
        model: 'gpt-4.1-mini',
        defaultSize: '1024x1024',
        defaultQuality: 'auto',
        defaultFormat: 'png',
        organization: 'test-org',
        lastUsed: '2023-01-01T00:00:00.000Z',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      }));

      const result = await configManager.getConfigStatus();

      expect(result).toEqual({
        configured: true,
        hasApiKey: true,
        model: 'gpt-4.1-mini',
        organization: 'test-org',
        lastUsed: '2023-01-01T00:00:00.000Z'
      });
    });

    it('should return not configured status when API key missing', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        model: 'gpt-4.1-mini',
        defaultSize: '1024x1024',
        defaultQuality: 'auto',
        defaultFormat: 'png',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      }));

      const result = await configManager.getConfigStatus();

      expect(result).toEqual({
        configured: false,
        hasApiKey: false,
        model: 'gpt-4.1-mini',
        organization: undefined,
        lastUsed: undefined
      });
    });
  });

  describe('updateApiKey', () => {
    it('should update API key and organization', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        model: 'gpt-4.1-mini',
        defaultSize: '1024x1024',
        defaultQuality: 'auto',
        defaultFormat: 'png',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      }));
      mockFs.writeFile.mockResolvedValue();

      await configManager.updateApiKey('sk-new-key', 'new-org');

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/home/testuser/.mcp-openai-image.json',
        expect.stringContaining('"apiKey": "sk-new-key"'),
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/home/testuser/.mcp-openai-image.json',
        expect.stringContaining('"organization": "new-org"')
      );
    });

    it('should throw error for invalid API key', async () => {
      await expect(configManager.updateApiKey('invalid-key')).rejects.toThrow('Invalid API key format');
    });
  });

  describe('updateModel', () => {
    it('should update model', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        model: 'gpt-4.1-mini',
        defaultSize: '1024x1024',
        defaultQuality: 'auto',
        defaultFormat: 'png',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      }));
      mockFs.writeFile.mockResolvedValue();

      await configManager.updateModel('gpt-4.1');

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/home/testuser/.mcp-openai-image.json',
        expect.stringContaining('"model": "gpt-4.1"'),
      );
    });

    it('should throw error for unsupported model', async () => {
      await expect(configManager.updateModel('unsupported-model')).rejects.toThrow('Unsupported model');
    });
  });

  describe('updateLastUsed', () => {
    it('should update last used timestamp', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        model: 'gpt-4.1-mini',
        defaultSize: '1024x1024',
        defaultQuality: 'auto',
        defaultFormat: 'png',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      }));
      mockFs.writeFile.mockResolvedValue();

      await configManager.updateLastUsed();

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/home/testuser/.mcp-openai-image.json',
        expect.stringContaining('"lastUsed": "'),
      );
    });
  });

  describe('getter methods', () => {
    beforeEach(() => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        apiKey: 'sk-test-key',
        organization: 'test-org',
        model: 'gpt-4.1',
        defaultSize: '1024x1536',
        defaultQuality: 'high',
        defaultFormat: 'jpeg',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      }));
    });

    it('should get API key', async () => {
      const result = await configManager.getApiKey();
      expect(result).toBe('sk-test-key');
    });

    it('should get organization', async () => {
      const result = await configManager.getOrganization();
      expect(result).toBe('test-org');
    });

    it('should get model', async () => {
      const result = await configManager.getModel();
      expect(result).toBe('gpt-4.1');
    });

    it('should get default size', async () => {
      const result = await configManager.getDefaultSize();
      expect(result).toBe('1024x1536');
    });

    it('should get default quality', async () => {
      const result = await configManager.getDefaultQuality();
      expect(result).toBe('high');
    });

    it('should get default format', async () => {
      const result = await configManager.getDefaultFormat();
      expect(result).toBe('jpeg');
    });
  });
});