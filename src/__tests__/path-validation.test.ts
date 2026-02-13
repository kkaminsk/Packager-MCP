import { describe, it, expect } from 'vitest';
import { validateOutputPath, validateReadPath } from '../utils/path-validation.js';

describe('validateReadPath', () => {
  it('should accept a simple absolute path', () => {
    const result = validateReadPath('C:\\Users\\test\\file.txt', 'test-tool');
    expect(result).toBeTruthy();
  });

  it('should reject path traversal with ..', () => {
    expect(() =>
      validateReadPath('C:\\Users\\test\\..\\..\\Windows\\System32', 'test-tool')
    ).toThrow('Path traversal');
  });

  it('should reject relative path with ..', () => {
    expect(() =>
      validateReadPath('../../../etc/passwd', 'test-tool')
    ).toThrow('Path traversal');
  });

  it('should reject empty path', () => {
    expect(() => validateReadPath('', 'test-tool')).toThrow('empty');
  });

  it('should reject whitespace-only path', () => {
    expect(() => validateReadPath('   ', 'test-tool')).toThrow('empty');
  });
});

describe('validateOutputPath', () => {
  it('should accept path within allowed directory', () => {
    const result = validateOutputPath(
      'C:\\Packages\\MyApp',
      'test-tool',
      ['C:\\Packages']
    );
    expect(result).toContain('Packages');
    expect(result).toContain('MyApp');
  });

  it('should reject path outside allowed directory', () => {
    expect(() =>
      validateOutputPath(
        'D:\\SomewhereElse\\MyApp',
        'test-tool',
        ['C:\\Packages']
      )
    ).toThrow('outside the allowed directories');
  });

  it('should allow any path when no allowed dirs configured', () => {
    const result = validateOutputPath('D:\\AnyPath\\Output', 'test-tool');
    expect(result).toBeTruthy();
  });

  it('should allow any path when allowed dirs is empty array', () => {
    const result = validateOutputPath('D:\\AnyPath\\Output', 'test-tool', []);
    expect(result).toBeTruthy();
  });

  it('should reject traversal even within allowed directory', () => {
    expect(() =>
      validateOutputPath(
        'C:\\Packages\\..\\Windows',
        'test-tool',
        ['C:\\Packages']
      )
    ).toThrow('Path traversal');
  });
});
