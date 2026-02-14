import { SingletonProvider } from '@compliance-theater/typescript';
export const keycloakAdminClientFactory = async (config) => {
    const keycloakAdminClientModule = await SingletonProvider.Instance.getRequired(Symbol.for('@no-education/dynamic-modules/@keycloak/keycloak-admin-client'), async () => {
        const mod = await import('@keycloak/keycloak-admin-client');
        return mod;
    });
    return new keycloakAdminClientModule.default(config);
};
//# sourceMappingURL=keycloak-factories.js.map