import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { FileManager } from '../src/file-manager';
import { createMockImageMetadata, createMockBase64Image } from './setup';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
    readFile: jest.fn(),
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

describe('FileManager', () => {
  let fileManager: FileManager;
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockPath = join as jest.MockedFunction<typeof join>;
  const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHomedir.mockReturnValue('/home/user');
    mockPath.mockImplementation((...args) => args.join('/'));
    fileManager = new FileManager();
  });

  describe('saveImageToDesktop', () => {
    it('should save image to desktop', async () => {
      const base64Data = createMockBase64Image();
      const metadata = createMockImageMetadata();
      
      mockFs.writeFile.mockResolvedValue();
      
      const result = await fileManager.saveImageToDesktop(base64Data, 'png', metadata);

      expect(result).toMatch(/\/home\/user\/Desktop\/openai-image-.*\.png/);
      expect(mockFs.writeFile).toHaveBeenCalledTimes(1); // Only image, no metadata
      
      // Check image file was written
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringMatching(/\.png$/),
        expect.any(Buffer)
      );
    });

    it('should handle different image formats', async () => {
      const base64Data = createMockBase64Image();
      const metadata = createMockImageMetadata({ format: 'jpeg' });
      
      mockFs.writeFile.mockResolvedValue();
      
      const result = await fileManager.saveImageToDesktop(base64Data, 'jpeg', metadata);

      expect(result).toMatch(/\.jpg$/);
    });

    it('should throw error if file write fails', async () => {
      const base64Data = createMockBase64Image();
      const metadata = createMockImageMetadata();
      
      mockFs.writeFile.mockRejectedValue(new Error('Disk full'));
      
      await expect(fileManager.saveImageToDesktop(base64Data, 'png', metadata))
        .rejects.toThrow('Failed to save image to desktop');
    });

    // Metadata save test removed - no longer supported
  });

  describe('generateUniqueFilename', () => {
    it('should generate unique filename with timestamp', async () => {
      const filename = await fileManager.generateUniqueFilename('png');
      
      expect(filename).toMatch(/^openai-image-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-z0-9]{6}\.png$/);
    });

    it('should handle different formats', async () => {
      expect(await fileManager.generateUniqueFilename('jpeg')).toMatch(/\.jpg$/);
      expect(await fileManager.generateUniqueFilename('png')).toMatch(/\.png$/);
      expect(await fileManager.generateUniqueFilename('webp')).toMatch(/\.webp$/);
    });

    it('should generate different filenames on subsequent calls', async () => {
      const filename1 = await fileManager.generateUniqueFilename('png');
      const filename2 = await fileManager.generateUniqueFilename('png');
      
      expect(filename1).not.toBe(filename2);
    });
  });

  // saveMetadata tests removed - function no longer exists

  describe('getDesktopPath', () => {
    it('should return desktop path', () => {
      const result = fileManager.getDesktopPath();
      expect(result).toBe('/home/user/Desktop');
    });
  });

  describe('ensureDesktopExists', () => {
    it('should succeed if desktop exists', async () => {
      mockFs.access.mockResolvedValue();
      
      await expect(fileManager.ensureDesktopExists()).resolves.toBeUndefined();
    });

    it('should throw error if desktop not accessible', async () => {
      mockFs.access.mockRejectedValue(new Error('Not found'));
      
      await expect(fileManager.ensureDesktopExists())
        .rejects.toThrow('Desktop directory not accessible');
    });
  });

  describe('checkDiskSpace', () => {
    it('should return true if disk space available', async () => {
      mockFs.writeFile.mockResolvedValue();
      mockFs.unlink.mockResolvedValue();
      
      const result = await fileManager.checkDiskSpace();
      
      expect(result).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/home/user/Desktop/.mcp-test',
        'test'
      );
      expect(mockFs.unlink).toHaveBeenCalledWith('/home/user/Desktop/.mcp-test');
    });

    it('should return false if disk space not available', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Disk full'));
      
      const result = await fileManager.checkDiskSpace();
      
      expect(result).toBe(false);
    });
  });

  describe('getImageHistory', () => {
    it('should return list of image files', async () => {
      mockFs.readdir.mockResolvedValue([
        'openai-image-2023-01-01T00-00-00-000Z-abc123.png',
        'openai-image-2023-01-02T00-00-00-000Z-def456.jpg',
        'other-file.txt',
        'openai-image-2023-01-03T00-00-00-000Z-ghi789.webp'
      ] as any);
      
      const result = await fileManager.getImageHistory();
      
      expect(result).toEqual([
        '/home/user/Desktop/openai-image-2023-01-03T00-00-00-000Z-ghi789.webp',
        '/home/user/Desktop/openai-image-2023-01-02T00-00-00-000Z-def456.jpg',
        '/home/user/Desktop/openai-image-2023-01-01T00-00-00-000Z-abc123.png'
      ]);
    });

    it('should handle empty directory', async () => {
      mockFs.readdir.mockResolvedValue([] as any);
      
      const result = await fileManager.getImageHistory();
      
      expect(result).toEqual([]);
    });

    it('should handle readdir error', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Permission denied'));
      
      const result = await fileManager.getImageHistory();
      
      expect(result).toEqual([]);
    });
  });

  // loadMetadata tests removed - function no longer exists

  describe('cleanupOldImages', () => {
    it('should delete old images beyond keep count', async () => {
      const imageFiles = [
        '/home/user/Desktop/openai-image-2023-01-05T00-00-00-000Z-abc123.png',
        '/home/user/Desktop/openai-image-2023-01-04T00-00-00-000Z-def456.jpg',
        '/home/user/Desktop/openai-image-2023-01-03T00-00-00-000Z-ghi789.webp',
        '/home/user/Desktop/openai-image-2023-01-02T00-00-00-000Z-jkl012.png',
        '/home/user/Desktop/openai-image-2023-01-01T00-00-00-000Z-mno345.jpg'
      ];
      
      mockFs.readdir.mockResolvedValue(imageFiles.map(f => f.split('/').pop()) as any);
      mockFs.unlink.mockResolvedValue();
      
      await fileManager.cleanupOldImages(3);
      
      // Should delete 2 oldest images (keep 3)
      expect(mockFs.unlink).toHaveBeenCalledTimes(2); // Only images, no metadata files
      expect(mockFs.unlink).toHaveBeenCalledWith(imageFiles[3]);
      expect(mockFs.unlink).toHaveBeenCalledWith(imageFiles[4]);
    });

    it('should not delete anything if within keep count', async () => {
      mockFs.readdir.mockResolvedValue([
        'openai-image-2023-01-01T00-00-00-000Z-abc123.png',
        'openai-image-2023-01-02T00-00-00-000Z-def456.jpg'
      ] as any);
      
      await fileManager.cleanupOldImages(5);
      
      expect(mockFs.unlink).not.toHaveBeenCalled();
    });

    it('should handle deletion errors gracefully', async () => {
      mockFs.readdir.mockResolvedValue([
        'openai-image-2023-01-01T00-00-00-000Z-abc123.png',
        'openai-image-2023-01-02T00-00-00-000Z-def456.jpg'
      ] as any);
      mockFs.unlink.mockRejectedValue(new Error('Permission denied'));
      
      await expect(fileManager.cleanupOldImages(1)).resolves.toBeUndefined();
    });
  });

  describe('validateFormat', () => {
    it('should validate supported formats', () => {
      expect(fileManager.validateFormat('png')).toBe(true);
      expect(fileManager.validateFormat('jpeg')).toBe(true);
      expect(fileManager.validateFormat('webp')).toBe(true);
      expect(fileManager.validateFormat('PNG')).toBe(true);
      expect(fileManager.validateFormat('JPEG')).toBe(true);
    });

    it('should reject unsupported formats', () => {
      expect(fileManager.validateFormat('gif')).toBe(false);
      expect(fileManager.validateFormat('bmp')).toBe(false);
      expect(fileManager.validateFormat('tiff')).toBe(false);
      expect(fileManager.validateFormat('')).toBe(false);
    });
  });

  describe('getFileExtension', () => {
    it('should return correct extensions', () => {
      expect(fileManager.getFileExtension('png')).toBe('png');
      expect(fileManager.getFileExtension('jpeg')).toBe('jpg');
      expect(fileManager.getFileExtension('webp')).toBe('webp');
      expect(fileManager.getFileExtension('PNG')).toBe('png');
      expect(fileManager.getFileExtension('JPEG')).toBe('jpg');
    });

    it('should default to png for unknown formats', () => {
      expect(fileManager.getFileExtension('unknown')).toBe('png');
      expect(fileManager.getFileExtension('')).toBe('png');
    });
  });
});