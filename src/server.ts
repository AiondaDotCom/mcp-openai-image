import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  CallToolRequest, 
  CallToolResult,
  ListToolsRequestSchema,
  ListToolsRequest,
  ListToolsResult,
  Tool
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { ConfigManager } from './config-manager.js';
import { FileManager } from './file-manager.js';
import { ImageGenerator } from './image-generator.js';
import { 
  SUPPORTED_MODELS, 
  SUPPORTED_SIZES, 
  SUPPORTED_QUALITIES, 
  SUPPORTED_FORMATS, 
  SUPPORTED_BACKGROUNDS 
} from './types.js';

export class MCPImageServer {
  private server: Server;
  private configManager: ConfigManager;
  private fileManager: FileManager;
  private imageGenerator: ImageGenerator;

  constructor() {
    this.server = new Server({
      name: 'mcp-openai-image',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {}
      }
    });

    this.configManager = new ConfigManager();
    this.fileManager = new FileManager();
    this.imageGenerator = new ImageGenerator(this.configManager, this.fileManager);

    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async (request: ListToolsRequest): Promise<ListToolsResult> => {
      return {
        tools: this.getTools()
      };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest): Promise<CallToolResult> => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'generate-image':
            return await this.handleGenerateImage(args);
          case 'configure-server':
            return await this.handleConfigureServer(args);
          case 'edit-image':
            return await this.handleEditImage(args);
          case 'stream-image':
            return await this.handleStreamImage(args);
          case 'get-config-status':
            return await this.handleGetConfigStatus(args);
          case 'list-supported-models':
            return await this.handleListSupportedModels(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    });
  }

  private getTools(): Tool[] {
    return [
      {
        name: 'generate-image',
        description: 'Generate images using OpenAI\'s image generation API',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'Image description/prompt'
            },
            size: {
              type: 'string',
              enum: [...SUPPORTED_SIZES],
              default: '1024x1024',
              description: 'Image dimensions'
            },
            quality: {
              type: 'string',
              enum: [...SUPPORTED_QUALITIES],
              default: 'standard',
              description: 'Image quality setting'
            },
            format: {
              type: 'string',
              enum: [...SUPPORTED_FORMATS],
              default: 'png',
              description: 'Output file format'
            },
            background: {
              type: 'string',
              enum: [...SUPPORTED_BACKGROUNDS],
              default: 'auto',
              description: 'Background setting'
            },
            compression: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              description: 'Compression level for JPEG/WebP (0-100%)'
            }
          },
          required: ['prompt']
        }
      },
      {
        name: 'configure-server',
        description: 'Configure OpenAI API settings and credentials',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: {
              type: 'string',
              description: 'OpenAI API key'
            },
            organization: {
              type: 'string',
              description: 'OpenAI organization ID (required for image generation)'
            },
            model: {
              type: 'string',
              enum: [...SUPPORTED_MODELS],
              default: 'gpt-4.1',
              description: 'Model to use for image generation'
            }
          },
          required: ['apiKey', 'organization']
        }
      },
      {
        name: 'edit-image',
        description: 'Edit existing images using previous response ID for multi-turn editing',
        inputSchema: {
          type: 'object',
          properties: {
            editPrompt: {
              type: 'string',
              description: 'Edit instructions'
            },
            previousResponseId: {
              type: 'string',
              description: 'Previous response ID for multi-turn editing'
            },
            imageId: {
              type: 'string',
              description: 'Specific image ID to edit (alternative to previousResponseId)'
            }
          },
          required: ['editPrompt']
        }
      },
      {
        name: 'stream-image',
        description: 'Generate images with streaming for faster visual feedback',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'Image description/prompt'
            },
            partialImages: {
              type: 'number',
              minimum: 1,
              maximum: 3,
              default: 2,
              description: 'Number of partial images during streaming'
            },
            size: {
              type: 'string',
              enum: [...SUPPORTED_SIZES],
              default: '1024x1024',
              description: 'Image dimensions'
            }
          },
          required: ['prompt']
        }
      },
      {
        name: 'get-config-status',
        description: 'Check current configuration status',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'list-supported-models',
        description: 'List all supported OpenAI models for image generation',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    ];
  }

  private async handleGenerateImage(args: any): Promise<CallToolResult> {
    const schema = z.object({
      prompt: z.string()
        .min(1, "Prompt cannot be empty")
        .max(4000, "Prompt too long (max 4000 characters)")
        .refine(prompt => prompt.trim().length > 0, "Prompt cannot be only whitespace"),
      size: z.enum(SUPPORTED_SIZES).optional(),
      quality: z.enum(SUPPORTED_QUALITIES).optional(),
      format: z.enum(SUPPORTED_FORMATS).optional(),
      background: z.enum(SUPPORTED_BACKGROUNDS).optional(),
      compression: z.number()
        .min(0, "Compression must be between 0 and 100")
        .max(100, "Compression must be between 0 and 100")
        .optional()
    });

    const params = schema.parse(args);
    const result = await this.imageGenerator.generateImage(params);

    if (result.success) {
      return {
        content: [{
          type: 'text',
          text: `Image generated successfully!\n\n` +
                `File: ${result.fileName}\n` +
                `Path: ${result.filePath}\n` +
                `Size: ${result.metadata?.size}\n` +
                `Quality: ${result.metadata?.quality}\n` +
                `Format: ${result.metadata?.format}\n` +
                `Model: ${result.metadata?.model}\n` +
                `Response ID: ${result.responseId}\n` +
                `Image ID: ${result.imageId}\n\n` +
                `Original prompt: ${result.metadata?.prompt}\n` +
                `Revised prompt: ${result.revisedPrompt}`
        }]
      };
    } else {
      return {
        content: [{
          type: 'text',
          text: `Failed to generate image: ${result.error?.message}\n\n` +
                `Suggestions:\n${result.error?.suggestions?.map(s => `- ${s}`).join('\n')}`
        }],
        isError: true
      };
    }
  }

  private async handleConfigureServer(args: any): Promise<CallToolResult> {
    const schema = z.object({
      apiKey: z.string(),
      organization: z.string().min(1, "Organization ID is required for image generation"),
      model: z.enum(SUPPORTED_MODELS).optional()
    });

    const params = schema.parse(args);

    try {
      await this.configManager.updateApiKey(params.apiKey, params.organization);
      
      if (params.model) {
        await this.configManager.updateModel(params.model);
      }

      return {
        content: [{
          type: 'text',
          text: `Server configured successfully!\n\n` +
                `API Key: ${params.apiKey.substring(0, 10)}...\n` +
                `Organization: ${params.organization || 'Not set'}\n` +
                `Model: ${params.model || await this.configManager.getModel()}\n\n` +
                `Configuration status: configured\n` +
                `You can now use the image generation tools.`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to configure server: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleEditImage(args: any): Promise<CallToolResult> {
    const schema = z.object({
      editPrompt: z.string()
        .min(1, "Edit prompt cannot be empty")
        .max(4000, "Edit prompt too long (max 4000 characters)")
        .refine(prompt => prompt.trim().length > 0, "Edit prompt cannot be only whitespace"),
      previousResponseId: z.string().optional(),
      imageId: z.string().optional()
    });

    const params = schema.parse(args);
    const result = await this.imageGenerator.editImage(params);

    if (result.success) {
      return {
        content: [{
          type: 'text',
          text: `Image edited successfully!\n\n` +
                `File: ${result.fileName}\n` +
                `Path: ${result.filePath}\n` +
                `Response ID: ${result.responseId}\n` +
                `Image ID: ${result.imageId}\n\n` +
                `Edit prompt: ${params.editPrompt}\n` +
                `Revised prompt: ${result.revisedPrompt}`
        }]
      };
    } else {
      return {
        content: [{
          type: 'text',
          text: `Failed to edit image: ${result.error?.message}\n\n` +
                `Suggestions:\n${result.error?.suggestions?.map(s => `- ${s}`).join('\n')}`
        }],
        isError: true
      };
    }
  }

  private async handleStreamImage(args: any): Promise<CallToolResult> {
    const schema = z.object({
      prompt: z.string()
        .min(1, "Prompt cannot be empty")
        .max(4000, "Prompt too long (max 4000 characters)")
        .refine(prompt => prompt.trim().length > 0, "Prompt cannot be only whitespace"),
      partialImages: z.number()
        .min(1, "Partial images must be at least 1")
        .max(3, "Partial images cannot exceed 3")
        .optional(),
      size: z.enum(SUPPORTED_SIZES).optional()
    });

    const params = schema.parse(args);
    const result = await this.imageGenerator.streamImage(params);

    if (result.success) {
      return {
        content: [{
          type: 'text',
          text: `Image streamed successfully!\n\n` +
                `Final image: ${result.finalImagePath}\n` +
                `Partial images: ${result.partialImagePaths?.length || 0}\n` +
                `Response ID: ${result.responseId}\n\n` +
                `Original prompt: ${params.prompt}\n` +
                `Revised prompt: ${result.revisedPrompt}\n\n` +
                `Partial image paths:\n${result.partialImagePaths?.map(p => `- ${p}`).join('\n')}`
        }]
      };
    } else {
      return {
        content: [{
          type: 'text',
          text: `Failed to stream image: ${result.error?.message}\n\n` +
                `Suggestions:\n${result.error?.suggestions?.map(s => `- ${s}`).join('\n')}`
        }],
        isError: true
      };
    }
  }

  private async handleGetConfigStatus(args: any): Promise<CallToolResult> {
    console.error('Getting configuration status...');
    const status = await this.configManager.getConfigStatus();
    console.error('Configuration status response:', JSON.stringify(status, null, 2));

    return {
      content: [{
        type: 'text',
        text: `Configuration Status:\n\n` +
              `Configured: ${status.configured ? 'Yes' : 'No'}\n` +
              `Has API Key: ${status.hasApiKey ? 'Yes' : 'No'}\n` +
              `Model: ${status.model}\n` +
              `Organization: ${status.organization || 'Not set'}\n` +
              `Last Used: ${status.lastUsed || 'Never'}\n\n` +
              `${status.configured ? 'Ready to generate images!' : 'Please configure the server with your OpenAI API key first.'}`
      }]
    };
  }

  private async handleListSupportedModels(args: any): Promise<CallToolResult> {
    const currentModel = await this.configManager.getModel();

    return {
      content: [{
        type: 'text',
        text: `Supported Models:\n\n` +
              `${SUPPORTED_MODELS.map(model => `${model === currentModel ? '● ' : '○ '}${model}`).join('\n')}\n\n` +
              `Current Model: ${currentModel}\n` +
              `Image Generation Model: gpt-image-1\n\n` +
              `Note: The mainline model (above) is used to call the image generation tool,\n` +
              `but the actual image generation is always performed by gpt-image-1.`
      }]
    };
  }

  async run(): Promise<void> {
    try {
      // Add debugging for configuration loading
      console.error('Loading configuration...');
      const status = await this.configManager.getConfigStatus();
      console.error('Configuration status:', JSON.stringify(status, null, 2));
      
      // Check desktop access
      try {
        await this.fileManager.ensureDesktopExists();
        await this.fileManager.checkDiskSpace();
        await this.fileManager.cleanupOldImages(50);
      } catch (error) {
        console.error('Desktop access warning:', error);
      }
      
      // Minimal startup - just connect the server
      const transport = new StdioServerTransport();
      console.error('Starting MCP server...');
      await this.server.connect(transport);
      console.error('MCP server started successfully');
    } catch (error) {
      console.error('Server startup error:', error);
      throw error;
    }
  }
}