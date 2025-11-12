import { AwsConfig } from "../constants/awsconfig";
import { AuthMethod, AuthOptions } from "../types";
import { encodeBase64URL } from "../utils/base64";
import { SdkError } from "../errors/SdkError";
import { ERROR_CODES } from "../errors/codes";
import { Amplify } from "aws-amplify";
import {
  signIn,
  signUp,
  signOut,
  confirmSignUp,
  resendSignUpCode,
  resetPassword,
  confirmResetPassword,
  fetchAuthSession,
  JWT,
} from "@aws-amplify/auth";
import { DEFAULT_ENDPOINTS } from "../constants/endpoints";

export class AuthManager {
  private auth: AuthOptions;

  constructor(auth: AuthOptions) {
    if (auth.method === "email") {
      Amplify.configure(AwsConfig);
    }
    this.auth = auth;
  }

  public async login(
    email: string,
    password: string,
  ): Promise<{ userId: string; email: string; name: string }> {
    if (this.auth.method !== "email") {
      throw new SdkError(
        ERROR_CODES.AUTH_UNSUPPORTED_METHOD,
        "Login is only supported for email/password auth",
      );
    }

    try {
      const { isSignedIn } = await signIn({
        username: email,
        password,
      });

      if (!isSignedIn) {
        throw new SdkError(
          ERROR_CODES.AUTH_FAILED,
          "Sign in was not successful",
        );
      }
    } catch (err: any) {
      switch (err.name) {
        case "UserNotFoundException":
          throw new SdkError(
            ERROR_CODES.AUTH_USER_NOT_FOUND,
            "User does not exist",
            err,
          );
        case "UserNotConfirmedException":
          throw new SdkError(
            ERROR_CODES.AUTH_NOT_CONFIRMED,
            "User is not confirmed",
            err,
          );
        case "NotAuthorizedException":
          throw new SdkError(
            ERROR_CODES.AUTH_FAILED,
            "Incorrect email or password",
            err,
          );
        case "PasswordResetRequiredException":
          throw new SdkError(
            ERROR_CODES.AUTH_PASSWORD_RESET_REQUIRED,
            "Password reset required",
            err,
          );
        default:
          throw new SdkError(
            ERROR_CODES.AUTH_FAILED,
            "Authentication failed",
            err,
          );
      }
    }

    const idToken = await this.getIdToken();
    const payload = idToken.payload;

    return {
      userId: payload["custom:user_id"]!.toString(),
      email: payload.email!.toString(),
      name: payload.name!.toString(),
    };
  }

  public isCompatibleWithDefaultAuth(): boolean {
    return this.auth.method === "email" || this.auth.method === "jwt";
  }

  public isCompatibleWithCustomAuth(): boolean {
    return true; // All auth methods work with custom auth
  }

  public requireDefaultAuthCompatibility(): void {
    if (!this.isCompatibleWithDefaultAuth()) {
      throw new SdkError(
        ERROR_CODES.AUTH_UNSUPPORTED_METHOD,
        "This operation requires email/password or JWT authentication. API key authentication is not supported for this endpoint.",
      );
    }
  }

  public async signup(
    email: string,
    password: string,
    fullName: string,
  ): Promise<void> {
    if (this.auth.method !== "email") {
      throw new SdkError(
        ERROR_CODES.AUTH_UNSUPPORTED_METHOD,
        "Signup is only supported for email/password auth",
      );
    }
    try {
      const response = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            name: fullName,
          },
        },
      });
    } catch (err: any) {
      if (err.name === "UsernameExistsException") {
        throw new SdkError(
          ERROR_CODES.AUTH_USER_EXISTS,
          "An account with this email already exists",
          err,
        );
      }

      throw new SdkError(ERROR_CODES.AUTH_FAILED, "Sign up failed", err);
    }
  }

  public async logout(): Promise<void> {
    if (this.auth.method !== "email") {
      throw new SdkError(
        ERROR_CODES.AUTH_UNSUPPORTED_METHOD,
        "Logout is only supported for email/password auth",
      );
    }

    try {
      await signOut();
    } catch (err: any) {
      throw new SdkError(ERROR_CODES.AUTH_FAILED, "Failed to log out", err);
    }
  }

  public async confirmSignup(email: string, code: string): Promise<void> {
    if (this.auth.method !== "email") {
      throw new SdkError(
        ERROR_CODES.AUTH_UNSUPPORTED_METHOD,
        "Confirm signup is only supported for email/password auth",
      );
    }

    try {
      const res = await confirmSignUp({
        username: email,
        confirmationCode: code,
      });
    } catch (err: any) {
      throw new SdkError(
        ERROR_CODES.AUTH_CONFIRMATION_FAILED,
        "Confirmation failed",
        err,
      );
    }
  }

  public async resendSignUp(email: string): Promise<void> {
    if (this.auth.method !== "email") {
      throw new SdkError(
        ERROR_CODES.AUTH_UNSUPPORTED_METHOD,
        "Resend signup is only supported for email/password auth",
      );
    }

    try {
      await resendSignUpCode({
        username: email,
      });
    } catch (err: any) {
      throw new SdkError(
        ERROR_CODES.AUTH_RESEND_FAILED,
        "Failed to resend confirmation code",
        err,
      );
    }
  }

  public async forgotPassword(email: string): Promise<void> {
    if (this.auth.method !== "email") {
      throw new SdkError(
        ERROR_CODES.AUTH_UNSUPPORTED_METHOD,
        "Forgot password is only supported for email/password auth",
      );
    }

    try {
      await resetPassword({
        username: email,
      });
    } catch (err: any) {
      throw new SdkError(
        ERROR_CODES.AUTH_PASSWORD_RESET_FAILED,
        "Failed to initiate password reset",
        err,
      );
    }
  }

  public async forgotPasswordSubmit(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<void> {
    if (this.auth.method !== "email") {
      throw new SdkError(
        ERROR_CODES.AUTH_UNSUPPORTED_METHOD,
        "Forgot password submit is only supported for email/password auth",
      );
    }

    try {
      await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword,
      });
    } catch (err: any) {
      throw new SdkError(
        ERROR_CODES.AUTH_PASSWORD_RESET_SUBMIT_FAILED,
        "Failed to complete password reset",
        err,
      );
    }
  }

  public async getUserId(): Promise<string> {
    try {
      const userToken = await this.getIdToken();
      return userToken.payload["custom:user_id"]!.toString();
    } catch (e) {
      return "";
    }
  }

  public async getAuthorizationHeader(): Promise<string> {
    switch (this.auth.method) {
      case "apiKey":
        return this.auth.key;

      case "jwt":
        if (!this.auth.token) {
          throw new SdkError(
            ERROR_CODES.AUTH_MISSING_TOKEN,
            "JWT token missing",
          );
        }
        return `Bearer ${this.auth.token}`;

      case "email": {
        const token = (await this.getIdToken()).toString();
        return `Bearer ${token}`;
      }

      default:
        throw new SdkError(
          ERROR_CODES.AUTH_UNSUPPORTED_METHOD,
          "Unsupported auth method",
        );
    }
  }

  public async getWebSocketHeader(): Promise<string> {
    const host = DEFAULT_ENDPOINTS.host;
    const authorization = await this.getAuthorizationHeader();
    const header = {
      host,
      authorization,
    };
    return `header-${encodeBase64URL(JSON.stringify(header))}`;
  }

  public async getWebSocketProtocols(): Promise<string[]> {
    return [await this.getWebSocketHeader(), "aws-appsync-event-ws"];
  }

  private async getAccessToken(): Promise<string> {
    try {
      const session = await fetchAuthSession();
      const accessToken = session.tokens?.accessToken?.toString();
      if (!accessToken) {
        throw new SdkError(
          ERROR_CODES.AUTH_INVALID_TOKEN,
          "Access token not found",
        );
      }
      return accessToken;
    } catch (err) {
      // fallback: force refresh once
      try {
        const session = await fetchAuthSession({ forceRefresh: true });
        const accessToken = session.tokens?.accessToken?.toString();
        if (!accessToken) {
          throw new SdkError(
            ERROR_CODES.AUTH_INVALID_TOKEN,
            "Access token not found after forced refresh",
          );
        }
        return accessToken;
      } catch (err2) {
        throw new SdkError(
          ERROR_CODES.AUTH_FAILED,
          "Unable to get access token",
          err2,
        );
      }
    }
  }

  public async refreshTokens(): Promise<{
    idToken: string;
    accessToken: string;
  }> {
    if (this.auth.method !== "email") {
      throw new SdkError(
        ERROR_CODES.AUTH_UNSUPPORTED_METHOD,
        "Token refresh is only supported for email/password auth",
      );
    }

    try {
      const session = await fetchAuthSession({ forceRefresh: true });
      const id = session.tokens?.idToken?.toString();
      const at = session.tokens?.accessToken?.toString();
      if (!id || !at) {
        throw new SdkError(
          ERROR_CODES.AUTH_INVALID_TOKEN,
          "Empty tokens after refresh",
        );
      }
      return { idToken: id, accessToken: at };
    } catch (err) {
      throw new SdkError(
        ERROR_CODES.AUTH_FAILED,
        "Failed to refresh tokens",
        err,
      );
    }
  }

  public async refreshAccessToken(): Promise<string> {
    const { accessToken } = await this.refreshTokens();
    return accessToken;
  }

  private async getIdToken(): Promise<JWT> {
    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken;

      if (!idToken) {
        throw new SdkError(
          ERROR_CODES.AUTH_INVALID_TOKEN,
          "You're not signed in. Please sign in again.",
        );
      }

      // Check if token is expired
      const exp = idToken.payload.exp;
      if (exp === undefined) {
        throw new SdkError(
          ERROR_CODES.AUTH_INVALID_TOKEN,
          "Your session looks invalid. Please sign in again.",
        );
      }

      if (exp < Math.floor(Date.now() / 1000)) {
        throw new SdkError(
          ERROR_CODES.AUTH_EXPIRED_TOKEN,
          "Your session has expired. Please sign in again.",
        );
      }

      return idToken;
    } catch (err) {
      throw new SdkError(
        ERROR_CODES.AUTH_FAILED,
        "We couldn’t complete authentication. Please sign in again.",
        err,
      );
    }
  }

  public getAuthMethod(): AuthMethod {
    return this.auth.method;
  }
}
