declare module 'next-auth' {
  const NextAuth: unknown;
  export default NextAuth;
}

declare module 'next-auth/providers/keycloak' {
  const KeycloakProvider: unknown;
  export default KeycloakProvider;
}
