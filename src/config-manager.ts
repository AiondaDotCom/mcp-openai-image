import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { Config, ConfigStatus, SUPPORTED_MODELS } from './types.js';

export class ConfigManager {
  private configPath: string;
  private config: Config | null = null;

  constructor() {
    // Store config in user's home directory
    this.configPath = join(homedir(), '.mcp-openai-image.json');
  }

  async loadConfig(): Promise<Config> {
    if (this.config) {
      return this.config;
    }

    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(data);
      return this.config!;
    } catch (error) {
      // Config file doesn't exist or is invalid, create default
      this.config = this.createDefaultConfig();
      await this.saveConfig(this.config);
      return this.config;
    }
  }

  async saveConfig(config: Config): Promise<void> {
    try {
      config.updatedAt = new Date().toISOString();
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
      this.config = config;
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      // Basic validation - check if it's a non-empty string starting with 'sk-'
      if (!apiKey || typeof apiKey !== 'string' || !apiKey.startsWith('sk-')) {
        return false;
      }
      
      // Additional validation could be added here to test the key with OpenAI API
      return true;
    } catch (error) {
      return false;
    }
  }

  async getConfigStatus(): Promise<ConfigStatus> {
    const config = await this.loadConfig();
    
    return {
      configured: !!config.apiKey,
      hasApiKey: !!config.apiKey,
      model: config.model,
      organization: config.organization,
      lastUsed: config.lastUsed
    };
  }

  async updateApiKey(apiKey: string, organization?: string): Promise<void> {
    const isValid = await this.validateApiKey(apiKey);
    if (!isValid) {
      throw new Error('Invalid API key format. API key must start with "sk-"');
    }

    if (!organization) {
      throw new Error('Organization ID is required for image generation');
    }

    const config = await this.loadConfig();
    config.apiKey = apiKey;
    config.organization = organization;
    
    await this.saveConfig(config);
  }

  async updateModel(model: string): Promise<void> {
    if (!SUPPORTED_MODELS.includes(model as any)) {
      throw new Error(`Unsupported model: ${model}. Supported models: ${SUPPORTED_MODELS.join(', ')}`);
    }

    const config = await this.loadConfig();
    config.model = model;
    await this.saveConfig(config);
  }

  async updateLastUsed(): Promise<void> {
    const config = await this.loadConfig();
    config.lastUsed = new Date().toISOString();
    await this.saveConfig(config);
  }

  private createDefaultConfig(): Config {
    const now = new Date().toISOString();
    
    return {
      model: 'gpt-4.1',
      defaultSize: '1024x1024',
      defaultQuality: 'standard',
      defaultFormat: 'png',
      createdAt: now,
      updatedAt: now
    };
  }

  async getApiKey(): Promise<string | undefined> {
    const config = await this.loadConfig();
    return config.apiKey;
  }

  async getOrganization(): Promise<string | undefined> {
    const config = await this.loadConfig();
    return config.organization;
  }

  async getModel(): Promise<string> {
    const config = await this.loadConfig();
    return config.model;
  }

  async getDefaultSize(): Promise<string> {
    const config = await this.loadConfig();
    return config.defaultSize;
  }

  async getDefaultQuality(): Promise<string> {
    const config = await this.loadConfig();
    return config.defaultQuality;
  }

  async getDefaultFormat(): Promise<string> {
    const config = await this.loadConfig();
    return config.defaultFormat;
  }
}