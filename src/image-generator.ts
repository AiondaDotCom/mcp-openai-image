import OpenAI from 'openai';
import { 
  GenerateImageParams, 
  GenerateImageResponse, 
  EditImageParams, 
  EditImageResponse,
  StreamImageParams,
  StreamImageResponse,
  OpenAIImageGenerationCall,
  OpenAIOptions,
  ImageMetadata,
  SUPPORTED_SIZES,
  SUPPORTED_QUALITIES,
  SUPPORTED_FORMATS,
  SUPPORTED_BACKGROUNDS
} from './types.js';
import { ConfigManager } from './config-manager.js';
import { FileManager } from './file-manager.js';

export class ImageGenerator {
  private openai: OpenAI | null = null;
  private configManager: ConfigManager;
  private fileManager: FileManager;

  constructor(configManager: ConfigManager, fileManager: FileManager) {
    this.configManager = configManager;
    this.fileManager = fileManager;
  }

  private async initializeOpenAI(): Promise<void> {
    const apiKey = await this.configManager.getApiKey();
    const organization = await this.configManager.getOrganization();
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please run configure-server first.');
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
      organization: organization
    });
  }

  async generateImage(params: GenerateImageParams): Promise<GenerateImageResponse> {
    try {
      await this.initializeOpenAI();
      
      if (!this.openai) {
        throw new Error('OpenAI client not initialized');
      }

      // Validate parameters
      const validatedParams = this.validateGenerateParams(params);
      
      // Call OpenAI API
      const response = await this.callOpenAI(validatedParams.prompt, {
        size: validatedParams.size,
        quality: validatedParams.quality,
        format: validatedParams.format,
        background: validatedParams.background,
        compression: validatedParams.compression
      });

      // Process response
      const imageCall = response.output.find((output: any) => output.type === 'image_generation_call');
      if (!imageCall || !imageCall.result) {
        throw new Error('No image generated in response');
      }

      // Create metadata
      const metadata: ImageMetadata = {
        prompt: validatedParams.prompt,
        revisedPrompt: imageCall.revised_prompt || validatedParams.prompt,
        size: validatedParams.size!,
        quality: validatedParams.quality!,
        format: validatedParams.format!,
        model: await this.configManager.getModel(),
        timestamp: new Date().toISOString(),
        responseId: response.id,
        imageId: imageCall.id
      };

      // Save image to desktop
      const filePath = await this.fileManager.saveImageToDesktop(
        imageCall.result,
        validatedParams.format!,
        metadata
      );

      // Update last used
      await this.configManager.updateLastUsed();

      return {
        success: true,
        filePath: filePath,
        fileName: filePath.split('/').pop(),
        responseId: response.id,
        imageId: imageCall.id,
        revisedPrompt: imageCall.revised_prompt,
        metadata: metadata
      };

    } catch (error) {
      let errorMessage = 'Unknown error occurred';
      let errorCode = 'GENERATION_FAILED';
      let suggestions = ['Check your API key', 'Verify your prompt', 'Try again later'];

      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Provide specific error handling based on error message
        if (error.message.includes('API key')) {
          errorCode = 'INVALID_API_KEY';
          suggestions = ['Configure your OpenAI API key using configure-server', 'Verify your API key is valid'];
        } else if (error.message.includes('billing')) {
          errorCode = 'BILLING_ISSUE';
          suggestions = ['Check your OpenAI billing status', 'Add payment method to your OpenAI account'];
        } else if (error.message.includes('quota')) {
          errorCode = 'QUOTA_EXCEEDED';
          suggestions = ['Check your API usage limits', 'Upgrade your OpenAI plan if needed'];
        } else if (error.message.includes('model')) {
          errorCode = 'MODEL_ERROR';
          suggestions = ['Try using a different model', 'Check if the model is available'];
        } else if (error.message.includes('prompt')) {
          errorCode = 'PROMPT_ERROR';
          suggestions = ['Review your prompt for inappropriate content', 'Try a different prompt'];
        }
      }

      return {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
          details: error,
          suggestions: suggestions
        }
      };
    }
  }

  async editImage(params: EditImageParams): Promise<EditImageResponse> {
    try {
      await this.initializeOpenAI();
      
      if (!this.openai) {
        throw new Error('OpenAI client not initialized');
      }

      // For now, treat editing as a new image generation with the edit prompt
      // In a full implementation, you'd need to handle the original image
      const response = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt: params.editPrompt,
        size: '1024x1024',
        quality: 'standard',
        n: 1,
        response_format: 'b64_json'
      });

      const imageData = response.data?.[0];
      if (!imageData) {
        throw new Error('No image data received from OpenAI');
      }
      const responseId = `edit_${Date.now()}`;
      const imageId = `img_${Date.now()}`;

      // Create metadata
      const metadata: ImageMetadata = {
        prompt: params.editPrompt,
        revisedPrompt: imageData.revised_prompt || params.editPrompt,
        size: '1024x1024',
        quality: 'standard',
        format: 'png',
        model: await this.configManager.getModel(),
        timestamp: new Date().toISOString(),
        responseId: responseId,
        imageId: imageId
      };

      // Save edited image to desktop
      const filePath = await this.fileManager.saveImageToDesktop(
        imageData.b64_json || '',
        metadata.format,
        metadata
      );

      // Update last used
      await this.configManager.updateLastUsed();

      return {
        success: true,
        filePath: filePath,
        fileName: filePath.split('/').pop(),
        responseId: responseId,
        imageId: imageId,
        revisedPrompt: imageData.revised_prompt
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EDIT_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
          suggestions: ['Check your response ID or image ID', 'Verify your edit prompt', 'Try again later']
        }
      };
    }
  }

  async streamImage(params: StreamImageParams): Promise<StreamImageResponse> {
    try {
      await this.initializeOpenAI();
      
      if (!this.openai) {
        throw new Error('OpenAI client not initialized');
      }

      const validatedParams = this.validateStreamParams(params);
      
      // For now, simulate streaming by generating a single image
      // In a full implementation, you'd need OpenAI's streaming API
      const response = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt: validatedParams.prompt,
        size: (validatedParams.size || '1024x1024') as '1024x1024' | '1024x1536' | '1536x1024',
        quality: 'standard',
        n: 1,
        response_format: 'b64_json'
      });

      const imageData = response.data?.[0];
      if (!imageData) {
        throw new Error('No image data received from OpenAI');
      }
      const responseId = `stream_${Date.now()}`;
      
      // Create metadata
      const metadata: ImageMetadata = {
        prompt: validatedParams.prompt,
        revisedPrompt: imageData.revised_prompt || validatedParams.prompt,
        size: (validatedParams.size || '1024x1024') as '1024x1024' | '1024x1536' | '1536x1024',
        quality: 'standard' as 'standard' | 'hd',
        format: 'png',
        model: await this.configManager.getModel(),
        timestamp: new Date().toISOString(),
        responseId: responseId,
        imageId: `img_${Date.now()}`
      };

      // Save final image
      const finalImagePath = await this.fileManager.saveImageToDesktop(
        imageData.b64_json || '',
        metadata.format,
        metadata
      );

      // Update last used
      await this.configManager.updateLastUsed();

      return {
        success: true,
        finalImagePath: finalImagePath,
        partialImagePaths: [],
        responseId: responseId,
        revisedPrompt: imageData.revised_prompt
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STREAM_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
          suggestions: ['Check your API key', 'Verify your prompt', 'Try again later']
        }
      };
    }
  }

  private async callOpenAI(prompt: string, options: OpenAIOptions): Promise<any> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    // Use the standard OpenAI image generation API
    const response = await this.openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      size: (options.size || '1024x1024') as '1024x1024' | '1024x1536' | '1536x1024',
      quality: (options.quality || 'standard') as 'standard' | 'hd',
      n: 1,
      response_format: 'b64_json'
    });

    // Transform the response to match expected format
    const imageData = response.data?.[0];
    if (!imageData) {
      throw new Error('No image data received from OpenAI');
    }
    
    return {
      id: `img_${Date.now()}`,
      output: [{
        type: 'image_generation_call',
        id: `call_${Date.now()}`,
        result: imageData.b64_json || '',
        revised_prompt: imageData.revised_prompt || prompt
      }]
    };
  }

  private validateGenerateParams(params: GenerateImageParams): Required<GenerateImageParams> {
    const validated = { ...params };

    // Set defaults
    validated.size = validated.size || '1024x1024';
    validated.quality = validated.quality || 'standard';
    validated.format = validated.format || 'png';
    validated.background = validated.background || 'auto';

    // Validate values
    if (!SUPPORTED_SIZES.includes(validated.size as any)) {
      throw new Error(`Unsupported size: ${validated.size}. Supported sizes: ${SUPPORTED_SIZES.join(', ')}`);
    }
    
    if (!SUPPORTED_QUALITIES.includes(validated.quality as any)) {
      throw new Error(`Unsupported quality: ${validated.quality}. Supported qualities: ${SUPPORTED_QUALITIES.join(', ')}`);
    }
    
    if (!SUPPORTED_FORMATS.includes(validated.format as any)) {
      throw new Error(`Unsupported format: ${validated.format}. Supported formats: ${SUPPORTED_FORMATS.join(', ')}`);
    }
    
    if (!SUPPORTED_BACKGROUNDS.includes(validated.background as any)) {
      throw new Error(`Unsupported background: ${validated.background}. Supported backgrounds: ${SUPPORTED_BACKGROUNDS.join(', ')}`);
    }

    if (validated.compression !== undefined && (validated.compression < 0 || validated.compression > 100)) {
      throw new Error('Compression must be between 0 and 100');
    }

    return validated as Required<GenerateImageParams>;
  }

  private validateStreamParams(params: StreamImageParams): Required<StreamImageParams> {
    const validated = { ...params };

    // Set defaults
    validated.partialImages = validated.partialImages || 2;
    validated.size = validated.size || '1024x1024';

    // Validate values
    if (validated.partialImages < 1 || validated.partialImages > 3) {
      throw new Error('Partial images must be between 1 and 3');
    }

    if (!SUPPORTED_SIZES.includes(validated.size as any)) {
      throw new Error(`Unsupported size: ${validated.size}. Supported sizes: ${SUPPORTED_SIZES.join(', ')}`);
    }

    return validated as Required<StreamImageParams>;
  }
}