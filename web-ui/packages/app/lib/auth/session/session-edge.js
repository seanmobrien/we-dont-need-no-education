import { setupSession } from './shared';
const hash = async (input) => {
    const enc = new TextEncoder();
    const data = enc.encode(input);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(digest));
    const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    return hashHex;
};
export const session = async (props) => {
    return setupSession({
        ...props,
        hash,
    });
};
//# sourceMappingURL=session-edge.js.map