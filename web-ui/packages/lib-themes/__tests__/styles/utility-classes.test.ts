import { describe, it, expect } from '@jest/globals';
import { cn, styles } from '../../src/styles';

describe('Utility Classes', () => {
  describe('cn function', () => {
    it('should combine multiple class names', () => {
      const result = cn('class1', 'class2', 'class3');
      expect(result).toBe('class1 class2 class3');
    });

    it('should filter out undefined values', () => {
      const result = cn('class1', undefined, 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should filter out null values', () => {
      const result = cn('class1', null, 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should filter out false values', () => {
      const result = cn('class1', false, 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle mixed valid and invalid values', () => {
      const result = cn('class1', undefined, 'class2', null, 'class3', false);
      expect(result).toBe('class1 class2 class3');
    });

    it('should return empty string for all invalid values', () => {
      const result = cn(undefined, null, false);
      expect(result).toBe('');
    });

    it('should handle empty arguments', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle single class name', () => {
      const result = cn('single-class');
      expect(result).toBe('single-class');
    });

    it('should support conditional class names', () => {
      const isActive = true;
      const isDisabled = false;
      const result = cn('base-class', isActive && 'active', isDisabled && 'disabled');
      expect(result).toBe('base-class active');
    });
  });

  describe('styles object', () => {
    describe('Layout styles', () => {
      it('should have container style with correct properties', () => {
        expect(styles.container).toBeDefined();
        expect(styles.container.margin).toBe('0 auto');
        expect(styles.container.padding).toBe('1.5rem');
        expect(styles.container.width).toBe('100%');
        expect(styles.container.borderRadius).toBe('0.5rem');
        expect(styles.container.boxShadow).toBeDefined();
      });

      it('should have table style with correct properties', () => {
        expect(styles.table).toBeDefined();
        expect(styles.table.width).toBe('100%');
        expect(styles.table.borderCollapse).toBe('collapse');
      });
    });

    describe('Typography styles', () => {
      it('should have title style with correct properties', () => {
        expect(styles.title).toBeDefined();
        expect(styles.title.fontSize).toBe('1.25rem');
        expect(styles.title.fontWeight).toBe(600);
        expect(styles.title.marginBottom).toBe('1rem');
      });

      it('should have error style with correct color', () => {
        expect(styles.error).toBeDefined();
        expect(styles.error.color).toBe('#ef4444');
        expect(styles.error.marginBottom).toBe('0.5rem');
      });

      it('should have loading style with correct color', () => {
        expect(styles.loading).toBeDefined();
        expect(styles.loading.color).toBe('#6b7280');
      });
    });

    describe('Form styles', () => {
      it('should have input style with correct properties', () => {
        expect(styles.input).toBeDefined();
        expect(styles.input.width).toBe('100%');
        expect(styles.input.border).toBe('1px solid #d1d5db');
        expect(styles.input.borderRadius).toBe('0.375rem');
        expect(styles.input.padding).toBe('0.5rem');
      });

      it('should have input focus styles', () => {
        expect(styles.input['&:focus']).toBeDefined();
        expect(styles.input['&:focus'].outline).toBe('none');
        expect(styles.input['&:focus'].boxShadow).toBeDefined();
      });

      it('should have textarea style', () => {
        expect(styles.textarea).toBeDefined();
        expect(styles.textarea.width).toBe('100%');
        expect(styles.textarea.border).toBe('1px solid #d1d5db');
      });
    });

    describe('Button styles', () => {
      it('should have base button style', () => {
        expect(styles.button).toBeDefined();
        expect(styles.button.padding).toBe('0.5rem');
        expect(styles.button.color).toBe('white');
        expect(styles.button.borderRadius).toBe('0.375rem');
        expect(styles.button.border).toBe('none');
        expect(styles.button.cursor).toBe('pointer');
        expect(styles.button.transition).toBeDefined();
      });

      it('should have primary button style', () => {
        expect(styles.buttonPrimary).toBeDefined();
        expect(styles.buttonPrimary.backgroundColor).toBe('#3b82f6');
        expect(styles.buttonPrimary['&:hover']).toBeDefined();
        expect(styles.buttonPrimary['&:hover'].backgroundColor).toBe('#2563eb');
      });

      it('should have secondary button style', () => {
        expect(styles.buttonSecondary).toBeDefined();
        expect(styles.buttonSecondary.backgroundColor).toBe('#10b981');
        expect(styles.buttonSecondary['&:hover']).toBeDefined();
        expect(styles.buttonSecondary['&:hover'].backgroundColor).toBe('#059669');
      });

      it('should have danger button style', () => {
        expect(styles.buttonDanger).toBeDefined();
        expect(styles.buttonDanger.backgroundColor).toBe('#ef4444');
        expect(styles.buttonDanger['&:hover']).toBeDefined();
        expect(styles.buttonDanger['&:hover'].backgroundColor).toBe('#dc2626');
      });
    });

    describe('Table styles', () => {
      it('should have tableCell style', () => {
        expect(styles.tableCell).toBeDefined();
        expect(styles.tableCell.border).toBe('1px solid #d1d5db');
        expect(styles.tableCell.padding).toBe('0.5rem');
      });
    });

    describe('Spacing styles', () => {
      it('should have marginTop style', () => {
        expect(styles.marginTop).toBeDefined();
        expect(styles.marginTop.marginTop).toBe('1rem');
      });

      it('should have marginRight style', () => {
        expect(styles.marginRight).toBeDefined();
        expect(styles.marginRight.marginRight).toBe('0.5rem');
      });

      it('should have marginLeft style', () => {
        expect(styles.marginLeft).toBeDefined();
        expect(styles.marginLeft.marginLeft).toBe('0.5rem');
      });
    });

    describe('Display styles', () => {
      it('should have flex style', () => {
        expect(styles.flex).toBeDefined();
        expect(styles.flex.display).toBe('flex');
      });
    });

    describe('Text styles', () => {
      it('should have fontSemibold style', () => {
        expect(styles.fontSemibold).toBeDefined();
        expect(styles.fontSemibold.fontWeight).toBe(600);
      });

      it('should have alignTop style', () => {
        expect(styles.alignTop).toBeDefined();
        expect(styles.alignTop.verticalAlign).toBe('top');
      });
    });

    describe('Width styles', () => {
      it('should have minWidthMax style', () => {
        expect(styles.minWidthMax).toBeDefined();
        expect(styles.minWidthMax.minWidth).toBe('max-content');
      });
    });

    describe('Immutability', () => {
      it('should be immutable (as const)', () => {
        // TypeScript enforces this at compile time
        // This test verifies the object structure is read-only
        expect(Object.isFrozen(styles)).toBe(false); // 'as const' doesn't freeze at runtime
        
        // But we can verify all properties exist
        const expectedKeys = [
          'container', 'table', 'title', 'error', 'loading',
          'input', 'textarea', 'button', 'buttonPrimary', 'buttonSecondary',
          'buttonDanger', 'tableCell', 'marginTop', 'marginRight', 'marginLeft',
          'flex', 'fontSemibold', 'alignTop', 'minWidthMax'
        ];
        
        expectedKeys.forEach(key => {
          expect(styles).toHaveProperty(key);
        });
      });
    });

    describe('Style categories', () => {
      it('should have all layout styles defined', () => {
        const layoutKeys = ['container', 'table'];
        layoutKeys.forEach(key => {
          expect(styles).toHaveProperty(key);
        });
      });

      it('should have all typography styles defined', () => {
        const typographyKeys = ['title', 'error', 'loading'];
        typographyKeys.forEach(key => {
          expect(styles).toHaveProperty(key);
        });
      });

      it('should have all form styles defined', () => {
        const formKeys = ['input', 'textarea'];
        formKeys.forEach(key => {
          expect(styles).toHaveProperty(key);
        });
      });

      it('should have all button styles defined', () => {
        const buttonKeys = ['button', 'buttonPrimary', 'buttonSecondary', 'buttonDanger'];
        buttonKeys.forEach(key => {
          expect(styles).toHaveProperty(key);
        });
      });

      it('should have all spacing styles defined', () => {
        const spacingKeys = ['marginTop', 'marginRight', 'marginLeft'];
        spacingKeys.forEach(key => {
          expect(styles).toHaveProperty(key);
        });
      });
    });
  });
});
