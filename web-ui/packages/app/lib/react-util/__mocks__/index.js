"use strict";
const generateUniqueId = jest
    .fn()
    .mockImplementation(() => `unique-id-${generateUniqueId.mock.calls.length}`);
module.exports = {
    ...jest.createMockFromModule('fs'),
    generateUniqueId,
};
//# sourceMappingURL=index.js.map