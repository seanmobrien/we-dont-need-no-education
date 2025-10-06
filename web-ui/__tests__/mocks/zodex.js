// Minimal manual mock for the `zodex` package used in tests.
// Exports a `Zodex` helper with zerialize and dezerialize methods.
// Keep behavior minimal and deterministic for unit tests.

const zerializedStorage = new Map();
let nextId = 0;

const getNextId = () => {
  nextId += 1;
  return `zodex-mock-next-id-${nextId}`;
};

const Zodex = {
  zerialize: (schema) => {
    if (schema === '__$$__reset__$$__') {
      zerializedStorage.clear();
      nextId = 0;
      return String(schema);
    }
    // Simple placeholder: return a stringified representation
    try {
      const id = getNextId();
      zerializedStorage.set(id, schema);
      return JSON.stringify({ _mockZodexSchema: true, id });
    } catch {
      return String(schema);
    }
  },
  dezerialize: (data) => {
    // Return a very small stub schema-like object
    try {
      const parsed = JSON.parse(data);
      if (parsed && parsed._mockZodexSchema && parsed.id) {
        return zerializedStorage.get(parsed.id);
      }
      return parsed;
    } catch {
      return { _mockZodexSchemaRestored: true, raw: String(data) };
    }
  },
};

module.exports = { Zodex };
