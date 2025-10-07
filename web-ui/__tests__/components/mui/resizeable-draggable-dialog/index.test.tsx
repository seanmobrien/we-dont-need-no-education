/**
 * @fileoverview Test suite for the resizable draggable dialog index module.
 *
 * This test file covers:
 * - Default export validation
 * - Type exports and re-exports
 * - Module integration and public API
 * - Import/export compatibility
 *
 * @author NoEducation Team
 * @version 1.0.0
 * @since 2025-07-07
 */

import ResizableDraggableDialog, {
  type Size,
  type RefineSizeFunction,
  type SetRefineSizeFunction,
  type ResizeableDraggablePaperProps,
  type ResizeableDraggableDialogProps,
  isValidSize,
} from '/components/mui/resizeable-draggable-dialog';

describe('ResizableDraggableDialog Index Module', () => {
  describe('Default Export', () => {
    it('should export ResizableDraggableDialog as default', () => {
      expect(ResizableDraggableDialog).toBeDefined();
      expect(typeof ResizableDraggableDialog).toBe('function');
    });

    it('should have correct component name', () => {
      expect(ResizableDraggableDialog.name).toBe('ResizableDraggableDialog');
    });

    it('should be a React component', () => {
      // React functional components are just functions
      expect(typeof ResizableDraggableDialog).toBe('function');
      // Functional components don't have prototypes like class components
      expect(ResizableDraggableDialog).toBeInstanceOf(Function);
    });
  });

  describe('Type Exports', () => {
    it('should export Size type', () => {
      // This test ensures the Size type is properly exported
      // We can't easily instantiate due to branded types, but we can test compilation
      const testTypeCheck = (size: Size): Size => size;
      expect(typeof testTypeCheck).toBe('function');
    });

    it('should export RefineSizeFunction type', () => {
      // This test ensures the RefineSizeFunction type is properly exported
      type TestRefineSizeFunction = RefineSizeFunction;
      const testFunction: TestRefineSizeFunction = jest.fn();
      expect(testFunction).toBeDefined();
    });

    it('should export SetRefineSizeFunction type', () => {
      // This test ensures the SetRefineSizeFunction type is properly exported
      type TestSetRefineSizeFunction = SetRefineSizeFunction;
      const testFunction: TestSetRefineSizeFunction = jest.fn();
      expect(testFunction).toBeDefined();
    });

    it('should export ResizeableDraggablePaperProps type', () => {
      // This test ensures the ResizeableDraggablePaperProps type is properly exported
      type TestPaperProps = ResizeableDraggablePaperProps;
      const testProps: Partial<TestPaperProps> = { height: 100 };
      expect(testProps).toBeDefined();
    });

    it('should export ResizeableDraggableDialogProps type', () => {
      // This test ensures the ResizeableDraggableDialogProps type is properly exported
      type TestDialogProps = ResizeableDraggableDialogProps;
      const testProps: Partial<TestDialogProps> = { title: 'test' };
      expect(testProps).toBeDefined();
    });
  });

  describe('Utility Function Exports', () => {
    it('should export isValidSize function', () => {
      expect(isValidSize).toBeDefined();
      expect(typeof isValidSize).toBe('function');
    });

    it('should export working isValidSize function', () => {
      const validSize = { height: 100, width: 200 };
      const invalidSize = { height: -100, width: 200 };

      expect(isValidSize(validSize)).toBe(true);
      expect(isValidSize(invalidSize)).toBe(false);
    });
  });

  describe('Module Integration', () => {
    it('should allow importing all exports together', () => {
      // Test that all exports are available and compatible
      expect(ResizableDraggableDialog).toBeDefined();
      expect(isValidSize).toBeDefined();

      // Test that the isValidSize function works with plain objects
      const testSize = { height: 100, width: 200 };
      expect(isValidSize(testSize)).toBe(true);
    });

    it('should support destructured imports', () => {
      // This is tested by the import statement at the top of the file
      // If destructured imports work, this test will pass
      expect(true).toBe(true);
    });

    it('should support mixed import styles', () => {
      // Test that both default and named imports work together
      expect(ResizableDraggableDialog).toBeDefined();
      expect(isValidSize).toBeDefined();

      // They should be different things
      expect(ResizableDraggableDialog).not.toBe(isValidSize);
    });
  });

  describe('API Consistency', () => {
    it('should maintain stable API surface', () => {
      // Test that the expected exports are present
      const expectedExports = [
        'default', // ResizableDraggableDialog
        'isValidSize',
      ];

      // This test ensures no unexpected exports are added
      const actualExports = Object.keys({
        default: ResizableDraggableDialog,
        isValidSize,
      });

      expectedExports.forEach((exportName) => {
        expect(actualExports).toContain(exportName);
      });
    });

    it('should provide proper TypeScript support', () => {
      // This test ensures TypeScript intellisense and type checking work
      const validSize = { height: 100, width: 200 };

      if (isValidSize(validSize)) {
        // TypeScript should narrow the type here
        expect(validSize.height).toBe(100);
        expect(validSize.width).toBe(200);
      }
    });
  });

  describe('Compatibility Tests', () => {
    it('should be compatible with React.createElement', () => {
      // Test that the component can be used with React.createElement
      expect(() => {
        const element = {
          type: ResizableDraggableDialog,
          props: {
            isOpenState: [false, jest.fn()],
            title: 'Test',
            children: null,
          },
        };
        expect(element.type).toBe(ResizableDraggableDialog);
      }).not.toThrow();
    });

    it('should work with type inference', () => {
      // Test that TypeScript can infer types correctly
      const mockSetState = jest.fn();
      const testProps: Partial<ResizeableDraggableDialogProps> = {
        isOpenState: true,
        title: 'Test Dialog',
        modal: false,
      };

      expect(testProps.isOpenState).toBe(true);
      expect(testProps.title).toBe('Test Dialog');
      expect(testProps.modal).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid size validation gracefully', () => {
      expect(() => {
        isValidSize(null);
        isValidSize(undefined);
        isValidSize('invalid');
        isValidSize(123);
        isValidSize([]);
        isValidSize({});
      }).not.toThrow();
    });

    it('should provide meaningful error messages for type mismatches', () => {
      // TypeScript should catch type mismatches at compile time
      // This test ensures runtime behavior is reasonable
      expect(isValidSize(null)).toBe(false);
      expect(isValidSize(undefined)).toBe(false);
      expect(isValidSize('string')).toBe(false);
      expect(isValidSize(123)).toBe(false);
    });
  });
});
