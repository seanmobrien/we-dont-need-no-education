const setupKeyCloakProvider = () => {
  const providerArgs = {
    clientId: process.env.AUTH_KEYCLOAK_CLIENT_ID,
    clientSecret: process.env.AUTH_KEYCLOAK_CLIENT_SECRET,
    issuer: process.env.AUTH_KEYCLOAK_ISSUER,
    authorization: {
      params: {
        access_type: 'offline',
        prompt: 'consent',
        response_type: 'code',
        scope: 'openid profile email roles',
      },
    },
    allowDangerousEmailAccountLinking: true,
  };
  const keycloak = {
    id: 'keycloak',
    name: 'Keycloak',
    type: 'oidc',
    style: { brandColor: '#428bca' },
    options: providerArgs,
  };
  return [keycloak];
};

module.exports = { setupKeyCloakProvider };
