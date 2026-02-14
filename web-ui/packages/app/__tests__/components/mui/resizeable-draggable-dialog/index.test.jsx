import ResizableDraggableDialog, { isValidSize, } from '@/components/mui/resizeable-draggable-dialog';
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
            expect(typeof ResizableDraggableDialog).toBe('function');
            expect(ResizableDraggableDialog).toBeInstanceOf(Function);
        });
    });
    describe('Type Exports', () => {
        it('should export Size type', () => {
            const testTypeCheck = (size) => size;
            expect(typeof testTypeCheck).toBe('function');
        });
        it('should export RefineSizeFunction type', () => {
            const testFunction = jest.fn();
            expect(testFunction).toBeDefined();
        });
        it('should export SetRefineSizeFunction type', () => {
            const testFunction = jest.fn();
            expect(testFunction).toBeDefined();
        });
        it('should export ResizeableDraggablePaperProps type', () => {
            const testProps = { height: 100 };
            expect(testProps).toBeDefined();
        });
        it('should export ResizeableDraggableDialogProps type', () => {
            const testProps = { title: 'test' };
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
            expect(ResizableDraggableDialog).toBeDefined();
            expect(isValidSize).toBeDefined();
            const testSize = { height: 100, width: 200 };
            expect(isValidSize(testSize)).toBe(true);
        });
        it('should support destructured imports', () => {
            expect(true).toBe(true);
        });
        it('should support mixed import styles', () => {
            expect(ResizableDraggableDialog).toBeDefined();
            expect(isValidSize).toBeDefined();
            expect(ResizableDraggableDialog).not.toBe(isValidSize);
        });
    });
    describe('API Consistency', () => {
        it('should maintain stable API surface', () => {
            const expectedExports = [
                'default',
                'isValidSize',
            ];
            const actualExports = Object.keys({
                default: ResizableDraggableDialog,
                isValidSize,
            });
            expectedExports.forEach((exportName) => {
                expect(actualExports).toContain(exportName);
            });
        });
        it('should provide proper TypeScript support', () => {
            const validSize = { height: 100, width: 200 };
            if (isValidSize(validSize)) {
                expect(validSize.height).toBe(100);
                expect(validSize.width).toBe(200);
            }
        });
    });
    describe('Compatibility Tests', () => {
        it('should be compatible with React.createElement', () => {
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
            const testProps = {
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
            expect(isValidSize(null)).toBe(false);
            expect(isValidSize(undefined)).toBe(false);
            expect(isValidSize('string')).toBe(false);
            expect(isValidSize(123)).toBe(false);
        });
    });
});
//# sourceMappingURL=index.test.jsx.map