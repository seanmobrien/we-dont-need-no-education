export type KeycloakConfig = {
  issuer: string;
  clientId: string;
  clientSecret: string;
};

export type TokenExchangeParams = {
  subjectToken: string;
  audience?: string;
  requestedTokenType?: string;
  scope?: string;
};

export type GoogleTokens = {
  refresh_token?: string;
  access_token: string;
};

export type TokenExchangeResponse = GoogleTokens & {
  token_type: string;
  expires_in?: number;
  scope?: string;
};


