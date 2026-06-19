export const TOKEN_ISSUER = 'TOKEN_ISSUER';

export interface TokenPayload {
  sub: string;
  email: string;
}

export interface TokenIssuer {
  sign(payload: TokenPayload): Promise<string>;
}
