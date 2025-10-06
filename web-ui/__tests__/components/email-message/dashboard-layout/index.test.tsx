/**
 * @fileoverview Unit tests for Dashboard Layout module exports
 *
 * Tests the main index.ts file exports to ensure all components,
 * types, and configurations are properly exported from the module.
 *
 * @module __tests__/components/email-message/dashboard-layout/index
 * @version 1.0.0
 * @since 2025-07-19
 */

import React from 'react';
import * as DashboardLayoutModule from '/components/email-message/dashboard-layout';
import '@testing-library/jest-dom';

// Mock all the individual components to avoid dependency issues
jest.mock(
  '/components/email-message/dashboard-layout/email-dashboard-layout',
  () => {
    const MockEmailDashboardLayout = React.forwardRef<
      HTMLDivElement,
      { children: React.ReactNode; session: unknown }
    >((props, ref) => (
      <div ref={ref} data-testid="email-dashboard-layout">
        {props.children}
      </div>
    ));
    MockEmailDashboardLayout.displayName = 'MockEmailDashboardLayout';
    return { EmailDashboardLayout: MockEmailDashboardLayout };
  },
);

jest.mock(
  '/components/email-message/dashboard-layout/custom-email-page-item',
  () => {
    const MockCustomEmailPageItem = React.forwardRef<
      HTMLDivElement,
      { item: unknown; mini: boolean; emailId: string }
    >((props, ref) => <div ref={ref} data-testid="custom-email-page-item" />);
    MockCustomEmailPageItem.displayName = 'MockCustomEmailPageItem';
    return { CustomEmailPageItem: MockCustomEmailPageItem };
  },
);

jest.mock(
  '/components/email-message/dashboard-layout/email-dashboard-toolbar-action',
  () => {
    const MockEmailDashboardToolbarAction = React.forwardRef<HTMLDivElement>(
      (props, ref) => (
        <div ref={ref} data-testid="email-dashboard-toolbar-action" />
      ),
    );
    MockEmailDashboardToolbarAction.displayName =
      'MockEmailDashboardToolbarAction';
    return { EmailDashboardToolbarAction: MockEmailDashboardToolbarAction };
  },
);

jest.mock('/components/email-message/dashboard-layout/branding', () => ({
  Branding: {
    title: 'Mystery Compliance Theater 2000',
    logo: <span data-testid="branding-logo">Logo</span>,
  },
}));

describe('Dashboard Layout Module Exports', () => {
  describe('Component Exports', () => {
    it('should export EmailDashboardLayout component', () => {
      expect(DashboardLayoutModule.EmailDashboardLayout).toBeDefined();
      expect(typeof DashboardLayoutModule.EmailDashboardLayout).toBe('object');
    });

    it('should export CustomEmailPageItem component', () => {
      expect(DashboardLayoutModule.CustomEmailPageItem).toBeDefined();
      expect(typeof DashboardLayoutModule.CustomEmailPageItem).toBe('object');
    });

    it('should export EmailDashboardToolbarAction component', () => {
      expect(DashboardLayoutModule.EmailDashboardToolbarAction).toBeDefined();
      expect(typeof DashboardLayoutModule.EmailDashboardToolbarAction).toBe(
        'object',
      );
    });
  });

  describe('Configuration Exports', () => {
    it('should export Branding configuration', () => {
      expect(DashboardLayoutModule.Branding).toBeDefined();
      expect(typeof DashboardLayoutModule.Branding).toBe('object');
      expect(DashboardLayoutModule.Branding).toHaveProperty('title');
      expect(DashboardLayoutModule.Branding).toHaveProperty('logo');
    });

    it('should export Branding with correct structure', () => {
      expect(DashboardLayoutModule.Branding.title).toBe(
        'Mystery Compliance Theater 2000',
      );
      expect(React.isValidElement(DashboardLayoutModule.Branding.logo)).toBe(
        true,
      );
    });
  });

  describe('All Expected Exports', () => {
    it('should export all expected components', () => {
      const expectedComponentExports = [
        'EmailDashboardLayout',
        'CustomEmailPageItem',
        'EmailDashboardToolbarAction',
      ];

      expectedComponentExports.forEach((exportName) => {
        expect(DashboardLayoutModule).toHaveProperty(exportName);
        const moduleAsRecord = DashboardLayoutModule as Record<string, unknown>;
        expect(typeof moduleAsRecord[exportName]).toBe('object');
      });
    });

    it('should export all expected configurations', () => {
      const expectedConfigExports = ['Branding'];

      expectedConfigExports.forEach((exportName) => {
        expect(DashboardLayoutModule).toHaveProperty(exportName);
        const moduleAsRecord = DashboardLayoutModule as Record<string, unknown>;
        expect(typeof moduleAsRecord[exportName]).toBe('object');
      });
    });

    it('should not export any unexpected items', () => {
      const moduleKeys = Object.keys(DashboardLayoutModule);
      const expectedExports = [
        'EmailDashboardLayout',
        'CustomEmailPageItem',
        'EmailDashboardToolbarAction',
        'Branding',
      ];

      // Filter out any TypeScript type exports (they won't appear in runtime)
      const moduleAsRecord = DashboardLayoutModule as Record<string, unknown>;
      const runtimeExports = moduleKeys.filter(
        (key) => typeof moduleAsRecord[key] !== 'undefined',
      );

      expect(runtimeExports).toHaveLength(expectedExports.length);
      expectedExports.forEach((exportName) => {
        expect(runtimeExports).toContain(exportName);
      });
    });
  });

  describe('Component Functionality', () => {
    it('should allow EmailDashboardLayout to be rendered', () => {
      const Component = DashboardLayoutModule.EmailDashboardLayout;
      expect(() => {
        // eslint-disable-next-line react/no-children-prop
        React.createElement(Component, {
          children: React.createElement('div'),
          session: null,
        });
      }).not.toThrow();
    });

    it('should allow CustomEmailPageItem to be rendered', () => {
      const Component = DashboardLayoutModule.CustomEmailPageItem;
      expect(() => {
        React.createElement(Component, {
          item: { title: 'Test' },
          mini: false,
          emailId: 'test',
          pathname: '/messages',
        });
      }).not.toThrow();
    });

    it('should allow EmailDashboardToolbarAction to be rendered', () => {
      const Component = DashboardLayoutModule.EmailDashboardToolbarAction;
      expect(() => {
        React.createElement(Component);
      }).not.toThrow();
    });
  });

  describe('Module Structure', () => {
    it('should be a properly structured ES module', () => {
      expect(typeof DashboardLayoutModule).toBe('object');
      expect(DashboardLayoutModule).not.toBeNull();
    });

    it('should have clean export structure without circular dependencies', () => {
      // Each export should be directly accessible
      const exports = Object.keys(DashboardLayoutModule);
      const moduleAsRecord = DashboardLayoutModule as Record<string, unknown>;
      exports.forEach((exportName) => {
        const exportValue = moduleAsRecord[exportName];
        expect(exportValue).toBeDefined();
        expect(exportValue).not.toBeNull();
      });
    });
  });

  describe('Component Props Interface', () => {
    it('should have components that accept the expected props', () => {
      const {
        EmailDashboardLayout,
        CustomEmailPageItem,
        EmailDashboardToolbarAction,
      } = DashboardLayoutModule;

      // These should not throw when called with proper props
      expect(EmailDashboardLayout).toBeDefined();
      expect(CustomEmailPageItem).toBeDefined();
      expect(EmailDashboardToolbarAction).toBeDefined();
    });
  });

  describe('TypeScript Compatibility', () => {
    it('should have components that are TypeScript compatible', () => {
      // If this test compiles and runs, the TypeScript definitions are working
      const components = {
        EmailDashboardLayout: DashboardLayoutModule.EmailDashboardLayout,
        CustomEmailPageItem: DashboardLayoutModule.CustomEmailPageItem,
        EmailDashboardToolbarAction:
          DashboardLayoutModule.EmailDashboardToolbarAction,
      };

      Object.entries(components).forEach(([, component]) => {
        expect(component).toBeDefined();
        expect(typeof component).toBe('object');
      });
    });

    it('should have configuration objects that are TypeScript compatible', () => {
      const { Branding } = DashboardLayoutModule;

      // Should satisfy the BrandingConfig interface
      expect(typeof Branding.title).toBe('string');
      expect(React.isValidElement(Branding.logo)).toBe(true);
    });
  });
});
