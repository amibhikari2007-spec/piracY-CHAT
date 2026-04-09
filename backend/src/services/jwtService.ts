import jwt from 'jsonwebtoken';
import config from '../config/env';

export interface TokenPayload {
  userId: string;
  username: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export const generateTokens = (payload: TokenPayload): AuthTokens => {
  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });

  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
  });

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwt.secret) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
};

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
};
