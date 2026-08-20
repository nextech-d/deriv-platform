export interface DerivAccount {
  accountId: string;
  loginid: string;
  currency: string;
  isDemo: boolean;
}

export interface SessionData {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  accounts?: DerivAccount[];
  activeAccountId?: string;
  isLoggedIn: boolean;
  /** CSRF token stored in session and exposed to client via a cookie. */
  csrfToken?: string;
}

export const defaultSession: SessionData = {
  isLoggedIn: false,
};
