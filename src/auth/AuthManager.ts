import { awsConfigWithOAuth, getAwsConfig, googleOAuthConfig } from "../constants/awsconfig";
import {
	AuthManagerOptions,
	AuthMethod,
	AuthOptions,
	CognitoOverrides,
	EmailAuth,
	LoginResult,
	OAuthOptions,
} from "../types";
import { encodeBase64URL } from "../utils/base64";
import { SdkError } from "../errors/SdkError";
import { ERROR_CODES } from "../errors/codes";
import { Amplify } from "aws-amplify";
import {
	signIn,
	signInWithRedirect,
	confirmSignIn,
	updatePassword,
	updateUserAttributes,
	signUp,
	signOut,
	confirmSignUp,
	resendSignUpCode,
	resetPassword,
	confirmResetPassword,
	fetchAuthSession,
	JWT,
} from "@aws-amplify/auth";
import { getDefaultEndpoints } from "../constants/endpoints";

const CONTACT_SUPPORT = "If this issue persists, please contact Signaloid Support at developer-support@signaloid.com.";

function isCognitoError(err: any, name: string, message?: RegExp): boolean {
	return err?.name === name && (!message || message.test(err?.message ?? ""));
}

function throwIfNetworkError(err: any): void {
	if (isCognitoError(err, "NetworkError")) {
		throw new SdkError(
			ERROR_CODES.AUTH_NETWORK_ERROR,
			"Could not connect to the server. Check your internet connection, then try again.",
			err,
		);
	}
}

function throwIfRateLimited(err: any): void {
	if (isCognitoError(err, "TooManyRequestsException") || isCognitoError(err, "LimitExceededException")) {
		throw new SdkError(
			ERROR_CODES.AUTH_RATE_LIMITED,
			"Too many attempts. Wait a few minutes and try again.",
			err,
		);
	}
}

function throwIfUserNotFound(err: any): void {
	if (isCognitoError(err, "UserNotFoundException")) {
		throw new SdkError(
			ERROR_CODES.AUTH_USER_NOT_FOUND,
			"No account exists for this email. Check the email or sign up.",
			err,
		);
	}
}

/** Turns a Cognito or Lambda reason into a sentence, without the given prefix. */
function toSentence(text: string, prefix: RegExp): string {
	const reason = text.replace(prefix, "").trim();
	const sentence = reason.charAt(0).toUpperCase() + reason.slice(1);
	return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function throwIfPasswordInvalid(err: any): void {
	if (isCognitoError(err, "InvalidPasswordException", /security reasons/i)) {
		throw new SdkError(
			ERROR_CODES.AUTH_PASSWORD_REJECTED,
			"For security reasons, Signaloid cannot accept this password. Please choose a different one.",
			err,
		);
	}
	if (isCognitoError(err, "InvalidPasswordException")) {
		throw new SdkError(
			ERROR_CODES.AUTH_PASSWORD_POLICY,
			toSentence(err.message ?? "", /^Password (did not conform with|does not conform to) policy:/i),
			err,
		);
	}
}

/** The Cognito pool the SDK configured Amplify with, which tells its own setup from the host app's. */
let sdkConfiguredPool: CognitoOverrides | undefined;

/** Whether two Amplify Cognito configurations name the same pool and app client. */
function isSamePool(a: Partial<CognitoOverrides>, b: CognitoOverrides): boolean {
	return a.userPoolId === b.userPoolId && a.userPoolClientId === b.userPoolClientId;
}

/** Whether an Amplify `oauth` block uses the domain and redirect URLs of `requested`. */
function isSameOAuth(
	current: { domain?: string; redirectSignIn?: string[]; redirectSignOut?: string[] },
	requested: OAuthOptions,
): boolean {
	const sameUrls = (a: string[] | undefined, b: string[]) =>
		a?.length === b.length && a.every((url, i) => url === b[i]);
	return (
		current.domain === requested.domain &&
		sameUrls(current.redirectSignIn, requested.redirectSignIn) &&
		sameUrls(current.redirectSignOut, requested.redirectSignOut)
	);
}

/** Warns that the client options in `ignored` have no effect, if there are any. */
function warnIgnored(ignored: string[], reason: string): void {
	if (ignored.length > 0) {
		console.warn(`Signaloid SDK: ignoring ${ignored.join(" and ")} because ${reason}.`);
	}
}

export class AuthManager {
	private auth: AuthOptions;

	constructor(auth: AuthOptions, options?: AuthManagerOptions) {
		if (auth.method === "email") {
			this.configureAmplify(auth, options);
		}
		this.auth = auth;
	}

	/**
	 * Sets up Amplify for email sign-in unless the host app already has. Amplify v6 takes the token
	 * refresh settings from the first configure() only, so the SDK never moves Amplify to another pool.
	 */
	private configureAmplify(auth: EmailAuth, options?: AuthManagerOptions): void {
		const requested = [...(auth.oauth ? ["`oauth`"] : []), ...(options?.cognito ? ["`cognito`"] : [])];

		if (options?.manageAmplifyConfig === false) {
			warnIgnored(requested, "`manageAmplifyConfig` is false");
			return;
		}

		const current = Amplify.getConfig();
		const cognito = current.Auth?.Cognito;

		if (!cognito?.userPoolId) {
			const config = auth.oauth
				? awsConfigWithOAuth(auth.oauth, options?.cognito)
				: getAwsConfig(options?.cognito);
			Amplify.configure({
				...current,
				Auth: { ...current.Auth, Cognito: { ...cognito, ...config.Auth.Cognito } },
			} as typeof current);
			sdkConfiguredPool = {
				userPoolId: config.Auth.Cognito.userPoolId,
				userPoolClientId: config.Auth.Cognito.userPoolClientId,
			};
			return;
		}

		const configuredBy =
			sdkConfiguredPool && isSamePool(cognito, sdkConfiguredPool) ? "an earlier client" : "the app";

		if (options?.cognito && !isSamePool(cognito, options.cognito)) {
			warnIgnored(requested, `${configuredBy} set up Amplify with another Cognito pool`);
			return;
		}

		if (!auth.oauth) {
			return;
		}

		const currentOAuth = cognito.loginWith?.oauth;

		if (currentOAuth) {
			if (!isSameOAuth(currentOAuth, auth.oauth)) {
				warnIgnored(
					["`oauth`"],
					`${configuredBy} set up Google sign-in with another domain or redirect URLs`,
				);
			}
			return;
		}

		if (configuredBy === "the app") {
			warnIgnored(["`oauth`"], "the app set up Amplify without Google sign-in");
			return;
		}

		Amplify.configure({
			...current,
			Auth: {
				...current.Auth,
				Cognito: {
					...cognito,
					loginWith: { ...cognito.loginWith, oauth: googleOAuthConfig(auth.oauth) },
				},
			},
		} as typeof current);
	}

	public async login(email: string, password: string): Promise<LoginResult> {
		if (this.auth.method !== "email") {
			throw new SdkError(
				ERROR_CODES.AUTH_UNSUPPORTED_METHOD,
				"Login is only supported for email/password auth",
			);
		}

		try {
			return await signIn({
				username: email,
				password,
			});
		} catch (err: any) {
			throwIfNetworkError(err);
			throwIfRateLimited(err);
			if (isCognitoError(err, "NotAuthorizedException", /security reasons/i)) {
				throw new SdkError(
					ERROR_CODES.AUTH_SIGN_IN_BLOCKED,
					"Your sign-in was blocked because this device or location was not recognized. Please reset your password.",
					err,
				);
			}
			if (
				isCognitoError(
					err,
					"NotAuthorizedException",
					/incorrect username or password|user is disabled/i,
				)
			) {
				throw new SdkError(
					ERROR_CODES.AUTH_INCORRECT_CREDENTIALS,
					"Incorrect email or password. Check them and try again.",
					err,
				);
			}
			switch (err.name) {
				case "UserNotFoundException":
					throw new SdkError(ERROR_CODES.AUTH_USER_NOT_FOUND, "User does not exist", err);
				case "UserNotConfirmedException":
					throw new SdkError(
						ERROR_CODES.AUTH_NOT_CONFIRMED,
						"User is not confirmed",
						err,
					);
				case "PasswordResetRequiredException":
					throw new SdkError(
						ERROR_CODES.AUTH_PASSWORD_RESET_REQUIRED,
						"Your password must be reset before you can sign in. Reset your password, then sign in.",
						err,
					);
				default:
					throw new SdkError(ERROR_CODES.AUTH_FAILED, "Authentication failed", err);
			}
		}
	}

	/** Redirects the browser to Google. The client must import "aws-amplify/auth/enable-oauth-listener" to complete the sign-in on return. */
	public async signInWithGoogle(): Promise<void> {
		this.requireEmailAuth("Google sign-in");

		try {
			await signInWithRedirect({ provider: "Google" });
		} catch (err: any) {
			throwIfNetworkError(err);
			if (isCognitoError(err, "OAuthNotConfigureException")) {
				throw new SdkError(
					ERROR_CODES.AUTH_GOOGLE_SIGN_IN_NOT_CONFIGURED,
					"Google sign-in is not available. Please sign in with your email and password.",
					err,
				);
			}
			throw new SdkError(
				ERROR_CODES.AUTH_GOOGLE_SIGN_IN_FAILED,
				`We could not open the Google sign-in page. Please try again. ${CONTACT_SUPPORT}`,
				err,
			);
		}
	}

	/** Sets a new password when `login()` returns the `CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED` step. */
	public async confirmNewPassword(newPassword: string): Promise<LoginResult> {
		this.requireEmailAuth("Setting a new password");

		try {
			return await confirmSignIn({ challengeResponse: newPassword });
		} catch (err: any) {
			if (isCognitoError(err, "NotAuthorizedException", /session is expired/i)) {
				throw new SdkError(
					ERROR_CODES.AUTH_NEW_PASSWORD_SESSION_EXPIRED,
					"Your sign-in session expired. Sign in again with your temporary password.",
					err,
				);
			}
			throwIfNetworkError(err);
			throwIfRateLimited(err);
			throwIfPasswordInvalid(err);
			throw new SdkError(ERROR_CODES.AUTH_NEW_PASSWORD_FAILED, "Could not set the new password", err);
		}
	}

	public async changePassword(oldPassword: string, newPassword: string): Promise<void> {
		this.requireEmailAuth("Changing the password");

		try {
			await updatePassword({ oldPassword, newPassword });
		} catch (err: any) {
			throwIfNetworkError(err);
			if (isCognitoError(err, "PasswordResetRequiredException")) {
				throw new SdkError(
					ERROR_CODES.AUTH_PASSWORD_RESET_REQUIRED,
					"Your password must be reset before you can change it. Reset your password, then sign in.",
					err,
				);
			}
			if (isCognitoError(err, "NotAuthorizedException", /access token has (expired|been revoked)/i)) {
				throw new SdkError(
					ERROR_CODES.AUTH_EXPIRED_TOKEN,
					"Your session has expired. Please sign in again.",
					err,
				);
			}
			throwIfRateLimited(err);
			if (isCognitoError(err, "NotAuthorizedException", /incorrect username or password/i)) {
				throw new SdkError(
					ERROR_CODES.AUTH_INCORRECT_CURRENT_PASSWORD,
					"Your current password is incorrect.",
					err,
				);
			}
			throwIfPasswordInvalid(err);
			throw new SdkError(
				ERROR_CODES.AUTH_PASSWORD_CHANGE_FAILED,
				"Could not change the password",
				err,
			);
		}
	}

	public async changeName(name: string): Promise<{ message: string }> {
		this.requireEmailAuth("Changing the name");

		try {
			await updateUserAttributes({ userAttributes: { name } });
			return { message: "Name updated successfully." };
		} catch (err: any) {
			throw new SdkError(ERROR_CODES.AUTH_NAME_CHANGE_FAILED, "Could not change the name", err);
		}
	}

	private requireEmailAuth(action: string): void {
		if (this.auth.method !== "email") {
			throw new SdkError(
				ERROR_CODES.AUTH_UNSUPPORTED_METHOD,
				`${action} is only supported for email/password auth`,
			);
		}
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

	public async signup(email: string, password: string, fullName?: string): Promise<void> {
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
					userAttributes: fullName ? { email, name: fullName } : { email },
				},
			});
		} catch (err: any) {
			throwIfNetworkError(err);
			throwIfRateLimited(err);
			if (isCognitoError(err, "UsernameExistsException")) {
				throw new SdkError(
					ERROR_CODES.AUTH_USER_EXISTS,
					"An account with this email already exists. Please use a different email or sign in.",
					err,
				);
			}
			if (isCognitoError(err, "UserLambdaValidationException", /temporary email/i)) {
				throw new SdkError(
					ERROR_CODES.AUTH_EMAIL_REJECTED,
					"Signaloid does not accept temporary email addresses. Sign up with a permanent email address.",
					err,
				);
			}
			if (isCognitoError(err, "InvalidParameterException", /email/i)) {
				throw new SdkError(
					ERROR_CODES.AUTH_INVALID_EMAIL,
					"This email address is not valid. Check it and try again.",
					err,
				);
			}
			if (isCognitoError(err, "UserLambdaValidationException")) {
				throw new SdkError(
					ERROR_CODES.AUTH_SIGNUP_REJECTED,
					toSentence(err.message ?? "", /^PreSignUp failed with error /),
					err,
				);
			}
			throwIfPasswordInvalid(err);

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

	public async confirmSignup(email: string, code: string): Promise<{ message: string }> {
		if (this.auth.method !== "email") {
			throw new SdkError(
				ERROR_CODES.AUTH_UNSUPPORTED_METHOD,
				"Confirm signup is only supported for email/password auth",
			);
		}

		try {
			await confirmSignUp({
				username: email,
				confirmationCode: code,
			});
			return { message: `The account for ${email} is verified. You can now sign in.` };
		} catch (err: any) {
			throwIfNetworkError(err);
			throwIfRateLimited(err);
			if (isCognitoError(err, "NotAuthorizedException", /status is confirmed/i)) {
				throw new SdkError(
					ERROR_CODES.AUTH_ALREADY_CONFIRMED,
					`The account for ${email} is already verified. You can sign in.`,
					err,
				);
			}
			throw new SdkError(ERROR_CODES.AUTH_CONFIRMATION_FAILED, "Confirmation failed", err);
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
			throwIfNetworkError(err);
			throwIfRateLimited(err);
			throw new SdkError(ERROR_CODES.AUTH_RESEND_FAILED, "Failed to resend confirmation code", err);
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
			throwIfNetworkError(err);
			throwIfRateLimited(err);
			throwIfUserNotFound(err);
			if (isCognitoError(err, "InvalidParameterException", /verified email/i)) {
				throw new SdkError(
					ERROR_CODES.AUTH_NOT_CONFIRMED,
					"Your email is not verified. Verify your account, then reset your password.",
					err,
				);
			}
			throw new SdkError(
				ERROR_CODES.AUTH_PASSWORD_RESET_FAILED,
				"Failed to initiate password reset",
				err,
			);
		}
	}

	public async forgotPasswordSubmit(email: string, code: string, newPassword: string): Promise<void> {
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
			throwIfNetworkError(err);
			throwIfRateLimited(err);
			throwIfUserNotFound(err);
			throwIfPasswordInvalid(err);
			if (isCognitoError(err, "CodeMismatchException")) {
				throw new SdkError(
					ERROR_CODES.AUTH_CODE_MISMATCH,
					"The verification code is incorrect. Check the code and try again.",
					err,
				);
			}
			if (isCognitoError(err, "ExpiredCodeException")) {
				throw new SdkError(
					ERROR_CODES.AUTH_CODE_EXPIRED,
					"The verification code has expired. Request a new code and try again.",
					err,
				);
			}
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
					throw new SdkError(ERROR_CODES.AUTH_MISSING_TOKEN, "JWT token missing");
				}
				return `Bearer ${this.auth.token}`;

			case "email": {
				const token = (await this.getIdToken()).toString();
				return `Bearer ${token}`;
			}

			default:
				throw new SdkError(ERROR_CODES.AUTH_UNSUPPORTED_METHOD, "Unsupported auth method");
		}
	}

	public async getWebSocketHeader(host: string = getDefaultEndpoints().host): Promise<string> {
		const authorization = await this.getAuthorizationHeader();
		const header = {
			host,
			authorization,
		};
		return `header-${encodeBase64URL(JSON.stringify(header))}`;
	}

	public async getWebSocketProtocols(host?: string): Promise<string[]> {
		return [await this.getWebSocketHeader(host), "aws-appsync-event-ws"];
	}

	private async getAccessToken(): Promise<string> {
		try {
			const session = await fetchAuthSession();
			const accessToken = session.tokens?.accessToken?.toString();
			if (!accessToken) {
				throw new SdkError(ERROR_CODES.AUTH_INVALID_TOKEN, "Access token not found");
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
				throw new SdkError(ERROR_CODES.AUTH_FAILED, "Unable to get access token", err2);
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
				throw new SdkError(ERROR_CODES.AUTH_INVALID_TOKEN, "Empty tokens after refresh");
			}
			return { idToken: id, accessToken: at };
		} catch (err) {
			throw new SdkError(ERROR_CODES.AUTH_FAILED, "Failed to refresh tokens", err);
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

			// Check the token has an expiry
			const exp = idToken.payload.exp;
			if (exp === undefined) {
				throw new SdkError(
					ERROR_CODES.AUTH_INVALID_TOKEN,
					"Your session looks invalid. Please sign in again.",
				);
			}

			return idToken;
		} catch (err) {
			if (err instanceof SdkError) throw err;
			throw new SdkError(
				ERROR_CODES.AUTH_SESSION_FAILED,
				"We could not complete authentication. Please sign in again.",
				err,
			);
		}
	}

	public getAuthMethod(): AuthMethod {
		return this.auth.method;
	}
}
