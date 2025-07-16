import { describe, it, expect } from '@jest/globals';
import { 
  SUPPORTED_MODELS, 
  SUPPORTED_SIZES, 
  SUPPORTED_QUALITIES, 
  SUPPORTED_FORMATS,
  SUPPORTED_BACKGROUNDS
} from '../src/types';

describe('Types', () => {
  describe('SUPPORTED_MODELS', () => {
    it('should contain expected models', () => {
      expect(SUPPORTED_MODELS).toContain('gpt-4.1-mini');
      expect(SUPPORTED_MODELS).toContain('gpt-4.1');
      expect(SUPPORTED_MODELS).toContain('gpt-4o');
      expect(SUPPORTED_MODELS).toContain('gpt-4o-mini');
      expect(SUPPORTED_MODELS).toHaveLength(4);
    });
  });

  describe('SUPPORTED_SIZES', () => {
    it('should contain expected sizes', () => {
      expect(SUPPORTED_SIZES).toContain('1024x1024');
      expect(SUPPORTED_SIZES).toContain('1024x1792');
      expect(SUPPORTED_SIZES).toContain('1792x1024');
      expect(SUPPORTED_SIZES).toHaveLength(3);
    });
  });

  describe('SUPPORTED_QUALITIES', () => {
    it('should contain expected qualities', () => {
      expect(SUPPORTED_QUALITIES).toContain('low');
      expect(SUPPORTED_QUALITIES).toContain('medium');
      expect(SUPPORTED_QUALITIES).toContain('high');
      expect(SUPPORTED_QUALITIES).toContain('auto');
      expect(SUPPORTED_QUALITIES).toHaveLength(4);
    });
  });

  describe('SUPPORTED_FORMATS', () => {
    it('should contain expected formats', () => {
      expect(SUPPORTED_FORMATS).toContain('png');
      expect(SUPPORTED_FORMATS).toContain('jpeg');
      expect(SUPPORTED_FORMATS).toContain('webp');
      expect(SUPPORTED_FORMATS).toHaveLength(3);
    });
  });

  describe('SUPPORTED_BACKGROUNDS', () => {
    it('should contain expected backgrounds', () => {
      expect(SUPPORTED_BACKGROUNDS).toContain('transparent');
      expect(SUPPORTED_BACKGROUNDS).toContain('opaque');
      expect(SUPPORTED_BACKGROUNDS).toContain('auto');
      expect(SUPPORTED_BACKGROUNDS).toHaveLength(3);
    });
  });
});