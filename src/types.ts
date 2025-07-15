export interface Config {
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

export interface ConfigStatus {
  configured: boolean;
  hasApiKey: boolean;
  model: string;
  organization?: string;
  lastUsed?: string;
}

export interface GenerateImageParams {
  prompt: string;
  size?: string;
  quality?: string;
  format?: string;
  background?: string;
  compression?: number;
}

export interface EditImageParams {
  editPrompt: string;
  previousResponseId?: string;
  imageId?: string;
}

export interface StreamImageParams {
  prompt: string;
  partialImages?: number;
  size?: string;
}

export interface ImageMetadata {
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

export interface GenerateImageResponse {
  success: boolean;
  filePath?: string;
  fileName?: string;
  responseId?: string;
  imageId?: string;
  revisedPrompt?: string;
  metadata?: ImageMetadata;
  error?: {
    code: string;
    message: string;
    details?: any;
    suggestions?: string[];
  };
}

export interface EditImageResponse {
  success: boolean;
  filePath?: string;
  fileName?: string;
  responseId?: string;
  imageId?: string;
  revisedPrompt?: string;
  originalImagePath?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
    suggestions?: string[];
  };
}

export interface StreamImageResponse {
  success: boolean;
  finalImagePath?: string;
  partialImagePaths?: string[];
  responseId?: string;
  revisedPrompt?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
    suggestions?: string[];
  };
}

export interface ConfigureServerResponse {
  success: boolean;
  message: string;
  configurationStatus: "configured" | "needs_setup";
  error?: {
    code: string;
    message: string;
    details?: any;
    suggestions?: string[];
  };
}

export interface OpenAIImageGenerationCall {
  id: string;
  type: "image_generation_call";
  status: "completed" | "in_progress" | "failed";
  revised_prompt?: string;
  result?: string; // base64 encoded image
}

export interface OpenAIOptions {
  size?: string;
  quality?: string;
  format?: string;
  background?: string;
  compression?: number;
}

export const SUPPORTED_MODELS = [
  "gpt-4.1", 
  "gpt-4.1-mini",
  "gpt-4o",
  "gpt-4o-mini"
] as const;

export const SUPPORTED_SIZES = [
  "1024x1024",
  "1024x1792", 
  "1792x1024"
] as const;

export const SUPPORTED_QUALITIES = [
  "low",
  "medium",
  "high",
  "auto"
] as const;

export const SUPPORTED_FORMATS = [
  "png",
  "jpeg",
  "webp"
] as const;

export const SUPPORTED_BACKGROUNDS = [
  "transparent",
  "opaque",
  "auto"
] as const;

export type SupportedModel = typeof SUPPORTED_MODELS[number];
export type SupportedSize = typeof SUPPORTED_SIZES[number];
export type SupportedQuality = typeof SUPPORTED_QUALITIES[number];
export type SupportedFormat = typeof SUPPORTED_FORMATS[number];
export type SupportedBackground = typeof SUPPORTED_BACKGROUNDS[number];