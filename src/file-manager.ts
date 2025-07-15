import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { ImageMetadata } from './types.js';

export class FileManager {
  private desktopPath: string;

  constructor() {
    this.desktopPath = join(homedir(), 'Desktop');
  }

  async saveImageToDesktop(base64Data: string, format: string, metadata: ImageMetadata): Promise<string> {
    try {
      // Validate input
      if (!base64Data || base64Data.trim().length === 0) {
        throw new Error('Invalid base64 data provided');
      }

      // Generate unique filename
      const fileName = await this.generateUniqueFilename(format);
      const filePath = join(this.desktopPath, fileName);

      // Convert base64 to buffer and save
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      // Check if image is too large (> 50MB)
      if (imageBuffer.length > 50 * 1024 * 1024) {
        // Large image warning - but continue processing
      }

      await fs.writeFile(filePath, imageBuffer);

      // Image saved successfully - metadata is returned in response, no need to save as file

      return filePath;
    } catch (error) {
      throw new Error(`Failed to save image to desktop: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateUniqueFilename(format: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const randomId = Math.random().toString(36).substring(2, 8);
    const extension = format === 'jpeg' ? 'jpg' : format;
    
    return `openai-image-${timestamp}-${randomId}.${extension}`;
  }


  getDesktopPath(): string {
    return this.desktopPath;
  }

  async ensureDesktopExists(): Promise<void> {
    try {
      await fs.access(this.desktopPath);
    } catch (error) {
      throw new Error(`Desktop directory not accessible: ${this.desktopPath}`);
    }
  }

  async checkDiskSpace(): Promise<boolean> {
    try {
      // Basic check - try to write a small test file
      const testFile = join(this.desktopPath, '.mcp-test');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getImageHistory(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.desktopPath);
      return files
        .filter(file => file.startsWith('openai-image-') && (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.webp')))
        .map(file => join(this.desktopPath, file))
        .sort((a, b) => b.localeCompare(a)); // Sort by name (newer first due to timestamp)
    } catch (error) {
      // Failed to get image history - return empty array
      return [];
    }
  }


  async cleanupOldImages(keepCount: number = 50): Promise<void> {
    try {
      const history = await this.getImageHistory();
      if (history.length <= keepCount) return;

      const toDelete = history.slice(keepCount);
      
      for (const imagePath of toDelete) {
        try {
          await fs.unlink(imagePath);
        } catch (error) {
          // Failed to delete old image - continue cleanup
        }
      }
    } catch (error) {
      // Failed to cleanup old images - not critical
    }
  }

  validateFormat(format: string): boolean {
    const supportedFormats = ['png', 'jpeg', 'webp'];
    return supportedFormats.includes(format.toLowerCase());
  }

  getFileExtension(format: string): string {
    switch (format.toLowerCase()) {
      case 'jpeg':
        return 'jpg';
      case 'png':
        return 'png';
      case 'webp':
        return 'webp';
      default:
        return 'png';
    }
  }
}