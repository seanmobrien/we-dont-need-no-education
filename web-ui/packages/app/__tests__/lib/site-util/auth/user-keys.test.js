import { hideConsoleOutput } from '@/__tests__/test-utils';
import { validateUserKeysAgainstServer, hasValidLocalKeys, generateUserKeyPair, getUserPublicKey, getUserPrivateKey, } from '@/lib/site-util/auth/user-keys';
const mockCryptoSubtle = {
    generateKey: jest.fn(),
    exportKey: jest.fn(),
};
Object.defineProperty(window, 'crypto', {
    value: {
        subtle: mockCryptoSubtle,
    },
});
global.btoa = jest.fn();
global.atob = jest.fn();
const createMockRequest = (result = null, error = null) => ({
    result,
    error,
    onsuccess: null,
    onerror: null,
});
let mockRequests = [];
const mockIDBObjectStore = {
    put: jest.fn(),
    get: jest.fn(),
};
const mockIDBTransaction = {
    objectStore: jest.fn().mockReturnValue(mockIDBObjectStore),
};
const mockIDBDatabase = {
    transaction: jest.fn().mockReturnValue(mockIDBTransaction),
    createObjectStore: jest.fn(),
    objectStoreNames: {
        contains: jest.fn().mockReturnValue(false),
    },
};
const mockIDBOpenRequest = {
    result: mockIDBDatabase,
    error: null,
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
};
Object.defineProperty(window, 'indexedDB', {
    value: {
        open: jest.fn().mockReturnValue(mockIDBOpenRequest),
    },
});
let requestIndex = 0;
const mockConsole = hideConsoleOutput();
describe('UserKeyManager Enhancements', () => {
    beforeEach(() => {
        mockRequests = [];
        requestIndex = 0;
        mockIDBObjectStore.get.mockImplementation(() => {
            const request = createMockRequest();
            mockRequests.push(request);
            return request;
        });
        mockIDBObjectStore.put.mockImplementation(() => {
            const request = createMockRequest();
            mockRequests.push(request);
            return request;
        });
        window.indexedDB.open.mockImplementation(() => {
            const request = {
                result: mockIDBDatabase,
                error: null,
                onsuccess: null,
                onerror: null,
                onupgradeneeded: null,
            };
            setTimeout(() => {
                if (request.onsuccess) {
                    request.onsuccess({});
                }
            }, 0);
            return request;
        });
    });
    afterEach(() => {
        mockConsole.dispose();
    });
    describe('hasValidLocalKeys', () => {
        it('should return true when both public and private keys exist', async () => {
            const keyData = {
                publicKey: {},
                privateKey: {},
            };
            mockIDBObjectStore.get.mockImplementation(() => {
                const request = createMockRequest(keyData);
                setTimeout(() => {
                    if (request.onsuccess) {
                        request.onsuccess({ target: request });
                    }
                }, 0);
                return request;
            });
            const result = await hasValidLocalKeys();
            expect(result).toBe(true);
        });
        it('should return false when no keys exist', async () => {
            mockIDBObjectStore.get.mockImplementation(() => {
                const request = createMockRequest(null);
                setTimeout(() => {
                    if (request.onsuccess) {
                        request.onsuccess({ target: request });
                    }
                }, 0);
                return request;
            });
            const result = await hasValidLocalKeys();
            expect(result).toBe(false);
        });
        it('should return false when only public key exists', async () => {
            const publicKeyData = {
                publicKey: {},
                privateKey: null,
            };
            mockIDBObjectStore.get.mockImplementation(() => {
                const request = createMockRequest(publicKeyData);
                setTimeout(() => {
                    if (request.onsuccess) {
                        request.onsuccess({ target: request });
                    }
                }, 0);
                return request;
            });
            const result = await hasValidLocalKeys();
            expect(result).toBe(false);
        });
        it('should handle database errors gracefully', async () => {
            mockIDBObjectStore.get.mockImplementation(() => {
                const request = createMockRequest(null, new Error('Database error'));
                setTimeout(() => {
                    if (request.onerror) {
                        request.onerror({ target: request });
                    }
                }, 0);
                return request;
            });
            const result = await hasValidLocalKeys();
            expect(result).toBe(false);
        });
    });
    describe('validateUserKeysAgainstServer', () => {
        const testServerKeys = ['server-key-1', 'server-key-2', 'server-key-3'];
        it('should return true when local key matches server key', async () => {
            const testLocalKey = 'server-key-2';
            const keyData = {
                publicKey: {},
                privateKey: {},
            };
            mockCryptoSubtle.exportKey.mockResolvedValue(new Uint8Array([1, 2, 3]));
            global.btoa.mockReturnValue(testLocalKey);
            mockIDBObjectStore.get.mockImplementation(() => {
                const request = createMockRequest(keyData);
                setTimeout(() => {
                    if (request.onsuccess) {
                        request.onsuccess({ target: request });
                    }
                }, 0);
                return request;
            });
            const result = await validateUserKeysAgainstServer(testServerKeys);
            expect(result).toBe(true);
        });
        it('should return false when local key does not match any server key', async () => {
            const testLocalKey = 'different-key';
            const keyData = {
                publicKey: {},
                privateKey: {},
            };
            mockCryptoSubtle.exportKey.mockResolvedValue(new Uint8Array([1, 2, 3]));
            global.btoa.mockReturnValue(testLocalKey);
            mockIDBObjectStore.get.mockImplementation(() => {
                const request = createMockRequest(keyData);
                setTimeout(() => {
                    if (request.onsuccess) {
                        request.onsuccess({ target: request });
                    }
                }, 0);
                return request;
            });
            const result = await validateUserKeysAgainstServer(testServerKeys);
            expect(result).toBe(false);
        });
        it('should return false when no local key exists', async () => {
            mockIDBObjectStore.get.mockImplementation(() => {
                const request = createMockRequest(null);
                setTimeout(() => {
                    if (request.onsuccess) {
                        request.onsuccess({ target: request });
                    }
                }, 0);
                return request;
            });
            const result = await validateUserKeysAgainstServer(testServerKeys);
            expect(result).toBe(false);
        });
        it('should handle crypto export errors gracefully', async () => {
            mockConsole.setup();
            const keyData = {
                publicKey: {},
                privateKey: {},
            };
            mockCryptoSubtle.exportKey.mockRejectedValue(new Error('Export failed'));
            mockIDBObjectStore.get.mockImplementation(() => {
                const request = createMockRequest(keyData);
                setTimeout(() => {
                    if (request.onsuccess) {
                        request.onsuccess({ target: request });
                    }
                }, 0);
                return request;
            });
            const result = await validateUserKeysAgainstServer(testServerKeys);
            expect(result).toBe(false);
        });
        it('should handle empty server keys array', async () => {
            mockIDBObjectStore.get.mockImplementation(() => {
                const request = createMockRequest({
                    publicKey: {},
                    privateKey: {},
                });
                setTimeout(() => {
                    if (request.onsuccess) {
                        request.onsuccess({ target: request });
                    }
                }, 0);
                return request;
            });
            mockCryptoSubtle.exportKey.mockResolvedValue(new Uint8Array([1, 2, 3]));
            global.btoa.mockReturnValue('some-key');
            const result = await validateUserKeysAgainstServer([]);
            expect(result).toBe(false);
        });
    });
    describe('generateUserKeyPair', () => {
        it('should generate and store new key pair', async () => {
            const mockKeyPair = {
                publicKey: {},
                privateKey: {},
            };
            mockCryptoSubtle.generateKey.mockResolvedValue(mockKeyPair);
            mockIDBObjectStore.put.mockImplementation(() => {
                const request = createMockRequest();
                setTimeout(() => {
                    if (request.onsuccess) {
                        request.onsuccess({ target: request });
                    }
                }, 0);
                return request;
            });
            const result = await generateUserKeyPair();
            expect(result).toEqual(mockKeyPair);
            expect(mockCryptoSubtle.generateKey).toHaveBeenCalledWith({
                name: 'ECDSA',
                namedCurve: 'P-256',
            }, false, ['sign', 'verify']);
        });
        it('should handle crypto generation errors', async () => {
            mockCryptoSubtle.generateKey.mockRejectedValue(new Error('Generation failed'));
            await expect(generateUserKeyPair()).rejects.toThrow('Generation failed');
        });
        it('should handle storage errors gracefully', async () => {
            const mockKeyPair = {
                publicKey: {},
                privateKey: {},
            };
            mockCryptoSubtle.generateKey.mockResolvedValue(mockKeyPair);
            mockIDBObjectStore.put.mockImplementation(() => {
                const request = createMockRequest(null, new Error('Storage failed'));
                setTimeout(() => {
                    if (request.onerror) {
                        request.onerror({ target: request });
                    }
                }, 0);
                return request;
            });
            await expect(generateUserKeyPair()).rejects.toThrow();
        });
    });
    describe('getUserPublicKey', () => {
        it('should retrieve public key from storage', async () => {
            const mockPublicKey = {};
            const keyData = {
                publicKey: mockPublicKey,
                privateKey: {},
            };
            mockIDBObjectStore.get.mockImplementation(() => {
                const request = createMockRequest(keyData);
                setTimeout(() => {
                    if (request.onsuccess) {
                        request.onsuccess({ target: request });
                    }
                }, 0);
                return request;
            });
            const result = await getUserPublicKey();
            expect(result).toBe(mockPublicKey);
        });
        it('should return null when no key exists', async () => {
            mockIDBObjectStore.get.mockImplementation(() => {
                const request = createMockRequest(null);
                setTimeout(() => {
                    if (request.onsuccess) {
                        request.onsuccess({ target: request });
                    }
                }, 0);
                return request;
            });
            const result = await getUserPublicKey();
            expect(result).toBeNull();
        });
        it('should handle database errors gracefully', async () => {
            mockIDBObjectStore.get.mockImplementation(() => {
                const request = createMockRequest(null, new Error('Database error'));
                setTimeout(() => {
                    if (request.onerror) {
                        request.onerror({ target: request });
                    }
                }, 0);
                return request;
            });
            const result = await getUserPublicKey();
            expect(result).toBeNull();
        });
    });
    describe('getUserPrivateKey', () => {
        it('should retrieve private key from storage', async () => {
            const mockPrivateKey = {};
            const keyData = {
                publicKey: {},
                privateKey: mockPrivateKey,
            };
            mockIDBObjectStore.get.mockImplementation(() => {
                const request = createMockRequest(keyData);
                setTimeout(() => {
                    if (request.onsuccess) {
                        request.onsuccess({ target: request });
                    }
                }, 0);
                return request;
            });
            const result = await getUserPrivateKey();
            expect(result).toBe(mockPrivateKey);
        });
        it('should return null when no key exists', async () => {
            mockIDBObjectStore.get.mockImplementation(() => {
                const request = createMockRequest(null);
                setTimeout(() => {
                    if (request.onsuccess) {
                        request.onsuccess({ target: request });
                    }
                }, 0);
                return request;
            });
            const result = await getUserPrivateKey();
            expect(result).toBeNull();
        });
        it('should handle database errors gracefully', async () => {
            mockIDBObjectStore.get.mockImplementation(() => {
                const request = createMockRequest(null, new Error('Database error'));
                setTimeout(() => {
                    if (request.onerror) {
                        request.onerror({ target: request });
                    }
                }, 0);
                return request;
            });
            const result = await getUserPrivateKey();
            expect(result).toBeNull();
        });
    });
});
//# sourceMappingURL=user-keys.test.js.map