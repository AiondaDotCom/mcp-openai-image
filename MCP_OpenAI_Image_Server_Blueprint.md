# MCP OpenAI Image Generation Server Blueprint

## Overview

This blueprint outlines the implementation of a Model Context Protocol (MCP) server that integrates with OpenAI's image generation API. The server provides tools for generating, editing, and streaming images while managing configuration internally and saving outputs to the user's Desktop.

## Key Features

- **OpenAI Integration**: Uses OpenAI's Responses API with `gpt-image-1` model
- **Internal Configuration**: Server manages its own configuration file
- **Desktop Integration**: Images saved to `~/Desktop` for AI access
- **Multi-turn Editing**: Support for iterative image editing
- **Streaming Support**: Real-time partial image generation
- **Secure Configuration**: Internal API key management with validation

## Project Structure

```
mcp-openai-image/
├── src/
│   ├── index.ts            # Main MCP server entry point
│   ├── server.ts           # MCP server implementation
│   ├── config-manager.ts   # Configuration management
│   ├── image-generator.ts  # OpenAI Responses API integration
│   ├── file-manager.ts     # Desktop file operations
│   └── types.ts           # TypeScript definitions
├── config/
│   └── server-config.json  # Internal configuration storage
├── package.json
├── tsconfig.json
└── README.md
```

## Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "openai": "^4.67.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "tsx": "^4.0.0"
  }
}
```

## MCP Tools Implementation

### 1. generate-image

**Description**: Generate images using OpenAI's image generation API

**Input Schema**:
```typescript
{
  name: "generate-image",
  description: "Generate images using OpenAI's image generation",
  inputSchema: {
    type: "object",
    properties: {
      prompt: { 
        type: "string", 
        description: "Image description/prompt" 
      },
      size: { 
        type: "string", 
        enum: ["1024x1024", "1024x1536", "1536x1024"],
        default: "1024x1024",
        description: "Image dimensions"
      },
      quality: {
        type: "string",
        enum: ["standard", "hd"],
        default: "standard",
        description: "Image quality setting"
      },
      format: {
        type: "string",
        enum: ["png", "jpeg", "webp"],
        default: "png",
        description: "Output file format"
      },
      background: {
        type: "string",
        enum: ["transparent", "opaque", "auto"],
        default: "auto",
        description: "Background setting"
      },
      compression: {
        type: "number",
        minimum: 0,
        maximum: 100,
        description: "Compression level for JPEG/WebP (0-100%)"
      }
    },
    required: ["prompt"]
  }
}
```

**Response**:
```typescript
{
  success: boolean,
  filePath: string,
  fileName: string,
  responseId: string,
  imageId: string,
  revisedPrompt: string,
  metadata: {
    size: string,
    quality: string,
    format: string,
    timestamp: string
  }
}
```

### 2. configure-server

**Description**: Configure OpenAI API settings and credentials

**Input Schema**:
```typescript
{
  name: "configure-server",
  description: "Configure OpenAI API settings",
  inputSchema: {
    type: "object",
    properties: {
      apiKey: { 
        type: "string", 
        description: "OpenAI API key" 
      },
      organization: { 
        type: "string", 
        description: "OpenAI organization ID (optional)" 
      },
      model: { 
        type: "string", 
        enum: ["gpt-4.1-mini", "gpt-4.1", "gpt-4o", "gpt-4o-mini"],
        default: "gpt-4.1-mini",
        description: "Model to use for image generation"
      }
    },
    required: ["apiKey"]
  }
}
```

**Response**:
```typescript
{
  success: boolean,
  message: string,
  configurationStatus: "configured" | "needs_setup"
}
```

### 3. edit-image

**Description**: Edit existing images using previous response ID for multi-turn editing

**Input Schema**:
```typescript
{
  name: "edit-image",
  description: "Edit existing images using previous response ID",
  inputSchema: {
    type: "object",
    properties: {
      previousResponseId: { 
        type: "string", 
        description: "Previous response ID for multi-turn editing" 
      },
      editPrompt: { 
        type: "string", 
        description: "Edit instructions" 
      },
      imageId: { 
        type: "string", 
        description: "Specific image ID to edit (alternative to previousResponseId)" 
      }
    },
    required: ["editPrompt"]
  }
}
```

**Response**:
```typescript
{
  success: boolean,
  filePath: string,
  fileName: string,
  responseId: string,
  imageId: string,
  revisedPrompt: string,
  originalImagePath?: string
}
```

### 4. stream-image

**Description**: Generate images with streaming for faster visual feedback

**Input Schema**:
```typescript
{
  name: "stream-image",
  description: "Generate images with streaming for faster feedback",
  inputSchema: {
    type: "object",
    properties: {
      prompt: { 
        type: "string", 
        description: "Image description/prompt" 
      },
      partialImages: { 
        type: "number", 
        minimum: 1, 
        maximum: 3, 
        default: 2,
        description: "Number of partial images during streaming"
      },
      size: { 
        type: "string", 
        enum: ["1024x1024", "1024x1536", "1536x1024"],
        default: "1024x1024"
      }
    },
    required: ["prompt"]
  }
}
```

**Response**:
```typescript
{
  success: boolean,
  finalImagePath: string,
  partialImagePaths: string[],
  responseId: string,
  revisedPrompt: string
}
```

### 5. get-config-status

**Description**: Check current configuration status

**Input Schema**:
```typescript
{
  name: "get-config-status",
  description: "Check current configuration status",
  inputSchema: {
    type: "object",
    properties: {},
    required: []
  }
}
```

**Response**:
```typescript
{
  configured: boolean,
  hasApiKey: boolean,
  model: string,
  organization?: string,
  lastUsed?: string
}
```

### 6. list-supported-models

**Description**: List all supported OpenAI models for image generation

**Input Schema**:
```typescript
{
  name: "list-supported-models",
  description: "List all supported OpenAI models for image generation",
  inputSchema: {
    type: "object",
    properties: {},
    required: []
  }
}
```

**Response**:
```typescript
{
  models: string[],
  currentModel: string,
  imageGenerationModel: "gpt-image-1"
}
```

## Core Implementation Components

### Configuration Manager (`config-manager.ts`)

**Responsibilities**:
- Manage internal JSON configuration file
- Secure API key storage and validation
- Configuration validation and status reporting
- Default settings management

**Key Methods**:
```typescript
class ConfigManager {
  async loadConfig(): Promise<Config>
  async saveConfig(config: Config): Promise<void>
  async validateApiKey(apiKey: string): Promise<boolean>
  async getConfigStatus(): Promise<ConfigStatus>
  async updateApiKey(apiKey: string): Promise<void>
}
```

**Configuration Schema**:
```typescript
interface Config {
  apiKey?: string;
  organization?: string;
  model: string;
  defaultSize: string;
  defaultQuality: string;
  defaultFormat: string;
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Image Generator (`image-generator.ts`)

**Responsibilities**:
- OpenAI Responses API integration
- Image generation with all parameters
- Multi-turn editing support
- Streaming image generation
- Error handling and retries

**Key Methods**:
```typescript
class ImageGenerator {
  async generateImage(params: GenerateImageParams): Promise<GenerateImageResponse>
  async editImage(params: EditImageParams): Promise<EditImageResponse>
  async streamImage(params: StreamImageParams): Promise<StreamImageResponse>
  private async callOpenAI(prompt: string, options: OpenAIOptions): Promise<OpenAIResponse>
}
```

**OpenAI Integration**:
```typescript
// Example implementation using OpenAI Responses API
const response = await openai.responses.create({
  model: "gpt-4.1-mini",
  input: prompt,
  tools: [{
    type: "image_generation",
    size: params.size,
    quality: params.quality,
    format: params.format,
    background: params.background,
    compression: params.compression
  }]
});
```

### File Manager (`file-manager.ts`)

**Responsibilities**:
- Desktop file operations
- Unique filename generation
- Metadata storage
- File format conversion
- Base64 to file conversion

**Key Methods**:
```typescript
class FileManager {
  async saveImageToDesktop(base64Data: string, format: string, metadata: ImageMetadata): Promise<string>
  async generateUniqueFilename(format: string): Promise<string>
  async saveMetadata(filePath: string, metadata: ImageMetadata): Promise<void>
  getDesktopPath(): string
}
```

**File Naming Convention**:
```
openai-image-{timestamp}-{randomId}.{extension}
```

**Metadata Format**:
```typescript
interface ImageMetadata {
  prompt: string;
  revisedPrompt: string;
  size: string;
  quality: string;
  format: string;
  model: string;
  timestamp: string;
  responseId: string;
  imageId: string;
}
```

## Error Handling Strategy

### Configuration Errors
- Missing API key: Return setup instructions
- Invalid API key: Return validation error with instructions
- Network errors: Return retry suggestions

### Generation Errors
- Rate limiting: Return wait time and retry suggestions
- Invalid prompts: Return content policy information
- File system errors: Return permissions and disk space information

### Response Format
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    suggestions?: string[];
  };
}
```

## Security Considerations

### API Key Management
- Store encrypted API keys in internal config
- Never log or expose API keys in responses
- Validate API keys before storage
- Support API key rotation

### File System Security
- Validate file paths and extensions
- Prevent directory traversal attacks
- Check disk space before writing
- Handle file permissions properly

### Content Safety
- Rely on OpenAI's built-in content filtering
- Log generation attempts for audit (without storing prompts)
- Implement rate limiting to prevent abuse

## Testing Strategy

### Unit Tests
- Configuration management
- File operations
- API integration
- Error handling

### Integration Tests
- End-to-end image generation
- Multi-turn editing workflow
- Streaming functionality
- Configuration setup flow

### Mock Testing
- OpenAI API responses
- File system operations
- Network failures
- Rate limiting scenarios

## Deployment Considerations

### Environment Requirements
- Node.js 18+
- Write permissions to Desktop
- Network access to OpenAI API
- Sufficient disk space for images

### Configuration Setup
1. Server reports configuration status
2. User provides API key through MCP client
3. Server validates and stores configuration
4. Ready for image generation

### Monitoring and Logging
- Log all API calls (without sensitive data)
- Track generation success/failure rates
- Monitor disk space usage
- Log configuration changes

## Future Enhancements

### Additional Features
- Image variation generation
- Batch image generation
- Custom output directories
- Image history management
- Usage analytics

### Performance Optimizations
- Image caching
- Parallel processing
- Compression optimization
- Streaming improvements

### Integration Possibilities
- Cloud storage integration
- Database storage for metadata
- Web interface for configuration
- Webhook notifications

## API Reference Summary

### OpenAI Responses API Integration
```typescript
// Basic image generation
const response = await openai.responses.create({
  model: "gpt-4.1-mini",
  input: "Generate an image of a sunset over mountains",
  tools: [{ type: "image_generation" }]
});

// With custom parameters
const response = await openai.responses.create({
  model: "gpt-4.1-mini",
  input: "Generate an image of a sunset over mountains",
  tools: [{
    type: "image_generation",
    size: "1024x1536",
    quality: "hd",
    format: "png",
    background: "transparent"
  }]
});

// Multi-turn editing
const editResponse = await openai.responses.create({
  model: "gpt-4.1-mini",
  previous_response_id: response.id,
  input: "Make the sunset more dramatic",
  tools: [{ type: "image_generation" }]
});

// Streaming generation
const stream = await openai.responses.create({
  model: "gpt-4.1-mini",
  input: "Generate an image of a sunset over mountains",
  stream: true,
  tools: [{ type: "image_generation", partial_images: 2 }]
});
```

This blueprint provides a comprehensive foundation for implementing a robust MCP server for OpenAI image generation with all necessary features for production use.