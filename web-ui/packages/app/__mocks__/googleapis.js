import { mockDeep } from 'jest-mock-extended';
const mockGoogle = mockDeep();
mockGoogle.gmail.mockReturnValue({
    users: {
        messages: {},
    },
});
export { mockGoogle as google };
//# sourceMappingURL=googleapis.js.map