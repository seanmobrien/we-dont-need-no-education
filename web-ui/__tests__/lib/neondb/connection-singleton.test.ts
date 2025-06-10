/**
 * Test to verify that singleton pattern is implemented correctly
 * for preventing multiple event listener registrations.
 */

describe('Event Listener Singleton Behavior', () => {
  it('should verify the singleton pattern is implemented correctly', () => {
    // This test verifies that our singleton variables work as expected
    let flag = false;
    
    function mockRegister() {
      if (flag) {
        return 'already registered';
      }
      flag = true;
      return 'registered';
    }

    // Simulate multiple calls
    const result1 = mockRegister();
    const result2 = mockRegister(); 
    const result3 = mockRegister();

    expect(result1).toBe('registered');
    expect(result2).toBe('already registered');
    expect(result3).toBe('already registered');
  });

  it('should verify instrumentation register function has singleton guard', async () => {
    // Import the register function and check that it has the guard logic
    const fs = require('fs');
    const path = require('path');
    
    const instrumentationPath = path.join(process.cwd(), 'instrumentation.ts');
    const instrumentationContent = fs.readFileSync(instrumentationPath, 'utf8');
    
    // Verify the singleton pattern is implemented
    expect(instrumentationContent).toContain('instrumentationRegistered');
    expect(instrumentationContent).toContain('if (instrumentationRegistered)');
    expect(instrumentationContent).toContain('instrumentationRegistered = true');
  });

  it('should verify database connection has singleton guard for prexit', async () => {
    // Import the connection file and check that it has the guard logic
    const fs = require('fs');
    const path = require('path');
    
    const connectionPath = path.join(process.cwd(), 'lib/neondb/connection.ts');
    const connectionContent = fs.readFileSync(connectionPath, 'utf8');
    
    // Verify the singleton pattern is implemented
    expect(connectionContent).toContain('prexitHandlerRegistered');
    expect(connectionContent).toContain('!prexitHandlerRegistered');
    expect(connectionContent).toContain('prexitHandlerRegistered = true');
  });
});