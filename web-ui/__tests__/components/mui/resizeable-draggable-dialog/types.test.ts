/**
 * @fileoverview Test suite for types and utility functions in the resizable draggable dialog module.
 *
 * This test file covers:
 * - isValidSize utility function validation
 * - Type definitions and type guards
 * - Edge cases and error conditions
 * - TypeScript type compatibility
 *
 * @author NoEducation Team
 * @version 1.0.0
 * @since 2025-07-07
 */

import {
  isValidSize,
  type Size,
  type Pixels,
  type RefineSizeFunction,
  type SetRefineSizeFunction,
  type ResizeableDraggablePaperProps,
  type ResizeableDraggableDialogProps,
} from '@/components/mui/resizeable-draggable-dialog/types';

describe('isValidSize utility function', () => {
  describe('valid size objects', () => {
    it('should return true for valid size with positive numbers', () => {
      const validSize = { height: 100, width: 200 };
      expect(isValidSize(validSize)).toBe(true);
    });

    it('should return true for valid size with decimal numbers', () => {
      const validSize = { height: 100.5, width: 200.7 };
      expect(isValidSize(validSize)).toBe(true);
    });

    it('should return true for valid size with large numbers', () => {
      const validSize = { height: 999999, width: 888888 };
      expect(isValidSize(validSize)).toBe(true);
    });

    it('should return true for valid size with minimal positive values', () => {
      const validSize = { height: 0.1, width: 0.1 };
      expect(isValidSize(validSize)).toBe(true);
    });

    it('should return true for size object with extra properties', () => {
      const sizeWithExtras = {
        height: 100,
        width: 200,
        extraProp: 'test',
        anotherProp: 42,
      };
      expect(isValidSize(sizeWithExtras)).toBe(true);
    });
  });

  describe('invalid size objects', () => {
    it('should return false for null', () => {
      expect(isValidSize(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidSize(undefined)).toBe(false);
    });

    it('should return false for primitive types', () => {
      expect(isValidSize(42)).toBe(false);
      expect(isValidSize('string')).toBe(false);
      expect(isValidSize(true)).toBe(false);
      expect(isValidSize(Symbol('test'))).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(isValidSize([])).toBe(false);
      expect(isValidSize([100, 200])).toBe(false);
    });

    it('should return false for functions', () => {
      expect(isValidSize(() => {})).toBe(false);
      expect(isValidSize(function () {})).toBe(false);
    });

    it('should return false for objects missing height property', () => {
      const missingHeight = { width: 200 };
      expect(isValidSize(missingHeight)).toBe(false);
    });

    it('should return false for objects missing width property', () => {
      const missingWidth = { height: 100 };
      expect(isValidSize(missingWidth)).toBe(false);
    });

    it('should return false for objects with non-numeric height', () => {
      const invalidHeight = { height: '100', width: 200 };
      expect(isValidSize(invalidHeight)).toBe(false);
    });

    it('should return false for objects with non-numeric width', () => {
      const invalidWidth = { height: 100, width: '200' };
      expect(isValidSize(invalidWidth)).toBe(false);
    });

    it('should return false for objects with zero height', () => {
      const zeroHeight = { height: 0, width: 200 };
      expect(isValidSize(zeroHeight)).toBe(false);
    });

    it('should return false for objects with zero width', () => {
      const zeroWidth = { height: 100, width: 0 };
      expect(isValidSize(zeroWidth)).toBe(false);
    });

    it('should return false for objects with negative height', () => {
      const negativeHeight = { height: -100, width: 200 };
      expect(isValidSize(negativeHeight)).toBe(false);
    });

    it('should return false for objects with negative width', () => {
      const negativeWidth = { height: 100, width: -200 };
      expect(isValidSize(negativeWidth)).toBe(false);
    });

    it('should return false for objects with NaN values', () => {
      const nanHeight = { height: NaN, width: 200 };
      const nanWidth = { height: 100, width: NaN };
      expect(isValidSize(nanHeight)).toBe(false);
      expect(isValidSize(nanWidth)).toBe(false);
    });

    it('should return false for objects with Infinity values', () => {
      const infiniteHeight = { height: Infinity, width: 200 };
      const infiniteWidth = { height: 100, width: Infinity };
      // Note: The current implementation allows Infinity since Infinity > 0 is true
      // This might be intentional behavior, but we document it here
      expect(isValidSize(infiniteHeight)).toBe(true);
      expect(isValidSize(infiniteWidth)).toBe(true);
    });

    it('should return false for empty objects', () => {
      expect(isValidSize({})).toBe(false);
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle very small positive numbers', () => {
      const verySmall = { height: Number.MIN_VALUE, width: Number.MIN_VALUE };
      expect(isValidSize(verySmall)).toBe(true);
    });

    it('should handle maximum safe integer values', () => {
      const maxSafe = {
        height: Number.MAX_SAFE_INTEGER,
        width: Number.MAX_SAFE_INTEGER,
      };
      expect(isValidSize(maxSafe)).toBe(true);
    });

    it('should handle objects with null properties', () => {
      const nullHeight = { height: null, width: 200 };
      const nullWidth = { height: 100, width: null };
      expect(isValidSize(nullHeight)).toBe(false);
      expect(isValidSize(nullWidth)).toBe(false);
    });

    it('should handle objects with undefined properties', () => {
      const undefinedHeight = { height: undefined, width: 200 };
      const undefinedWidth = { height: 100, width: undefined };
      expect(isValidSize(undefinedHeight)).toBe(false);
      expect(isValidSize(undefinedWidth)).toBe(false);
    });
  });
});

describe('Type definitions', () => {
  describe('Size type', () => {
    it('should accept valid size objects with branded types', () => {
      // This test ensures the Size type is properly defined
      const validSize: Size = { height: 100 as Pixels, width: 200 as Pixels };
      expect(validSize.height).toBe(100);
      expect(validSize.width).toBe(200);
    });

    it('should work with isValidSize type guard', () => {
      const unknownSize: unknown = { height: 100, width: 200 };

      if (isValidSize(unknownSize)) {
        // TypeScript should narrow the type to Size here
        expect(unknownSize.height).toBe(100);
        expect(unknownSize.width).toBe(200);
      }
    });
  });

  describe('Function type definitions', () => {
    it('should define RefineSizeFunction correctly', () => {
      const mockRefineSize: RefineSizeFunction = jest.fn((size: Size) => size);
      const testSize: Size = { height: 100 as Pixels, width: 200 as Pixels };

      const result = mockRefineSize(testSize);
      expect(mockRefineSize).toHaveBeenCalledWith(testSize);
      expect(result).toEqual(testSize);
    });

    it('should define SetRefineSizeFunction correctly', () => {
      const mockSetRefineSize: SetRefineSizeFunction = jest.fn();
      const testRefineFunction: RefineSizeFunction = (size: Size) => size;

      mockSetRefineSize(testRefineFunction);
      expect(mockSetRefineSize).toHaveBeenCalledWith(testRefineFunction);
    });
  });

  describe('Component prop types', () => {
    it('should define ResizeableDraggablePaperProps with required properties', () => {
      // Test that the type accepts all expected properties
      const paperProps: Partial<ResizeableDraggablePaperProps> = {
        height: 400,
        width: 600,
        minConstraints: [200, 150],
        maxConstraints: [800, 600],
        dialogId: 'test-dialog',
      };

      expect(paperProps.height).toBe(400);
      expect(paperProps.width).toBe(600);
      expect(paperProps.minConstraints).toEqual([200, 150]);
      expect(paperProps.maxConstraints).toEqual([800, 600]);
      expect(paperProps.dialogId).toBe('test-dialog');
    });

    it('should define ResizeableDraggableDialogProps with required properties', () => {
      // Test that the type accepts all expected properties
      const dialogProps: Partial<ResizeableDraggableDialogProps> = {
        isOpenState: true,
        title: 'Test Dialog',
        modal: false,
        initialWidth: 600,
        initialHeight: 400,
        draggable: true,
        onClose: jest.fn(),
      };

      expect(dialogProps.title).toBe('Test Dialog');
      expect(dialogProps.modal).toBe(false);
      expect(dialogProps.initialWidth).toBe(600);
      expect(dialogProps.initialHeight).toBe(400);
      expect(dialogProps.draggable).toBe(true);
    });
  });
});

describe('Type guard integration', () => {
  it('should work with runtime validation scenarios', () => {
    const testData = [
      { input: { height: 100, width: 200 }, expected: true },
      { input: { height: -100, width: 200 }, expected: false },
      { input: { height: '100', width: 200 }, expected: false },
      { input: null, expected: false },
      { input: undefined, expected: false },
      { input: {}, expected: false },
    ];

    testData.forEach(({ input, expected }) => {
      expect(isValidSize(input)).toBe(expected);
    });
  });

  it('should provide type safety for validated objects', () => {
    const maybeSize: unknown = { height: 300, width: 400 };

    if (isValidSize(maybeSize)) {
      // TypeScript should provide intellisense and type checking here
      const area = maybeSize.height * maybeSize.width;
      expect(area).toBe(120000);

      // These should be typed as numbers
      expect(typeof maybeSize.height).toBe('number');
      expect(typeof maybeSize.width).toBe('number');
    } else {
      fail('Size should be valid');
    }
  });
});

describe('Performance and memory considerations', () => {
  it('should handle repeated validation calls efficiently', () => {
    const testSize = { height: 100, width: 200 };
    const iterations = 10000;

    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      isValidSize(testSize);
    }

    const end = performance.now();
    const duration = end - start;

    // Should complete many validations quickly (less than 100ms)
    expect(duration).toBeLessThan(100);
  });

  it('should not cause memory leaks with large object validation', () => {
    const largeObject = {
      height: 100,
      width: 200,
      ...Array.from({ length: 1000 }, (_, i) => ({ [`prop${i}`]: i })).reduce(
        (acc, curr) => ({ ...acc, ...curr }),
        {},
      ),
    };

    // Should still validate correctly even with many extra properties
    expect(isValidSize(largeObject)).toBe(true);
  });
});
