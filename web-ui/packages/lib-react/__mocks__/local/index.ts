/**
 * @module react-util
 *
 * This module serves as a mock for the react-util module to be used in Jest tests.
 */

const generateUniqueId = jest
  .fn()
  .mockImplementation(() => `unique-id-${generateUniqueId.mock.calls.length}`);

module.exports = {
  ...jest.createMockFromModule('fs'),
  generateUniqueId,
};
