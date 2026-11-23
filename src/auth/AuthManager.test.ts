import * as amplifyAuth from "@aws-amplify/auth";
import { Amplify } from "aws-amplify";
import { AuthManager } from "./AuthManager";
import { ERROR_CODES } from "../errors/codes";

jest.mock("aws-amplify", () => ({ Amplify: { configure: jest.fn(), getConfig: () => ({}) } }));
jest.mock("@aws-amplify/auth", () => ({
	signIn: jest.fn(),
	signInWithRedirect: jest.fn(),
	confirmSignIn: jest.fn(),
	updatePassword: jest.fn(),
	updateUserAttributes: jest.fn(),
	signUp: jest.fn(),
	confirmSignUp: jest.fn(),
	resendSignUpCode: jest.fn(),
	resetPassword: jest.fn(),
	confirmResetPassword: jest.fn(),
	fetchAuthSession: jest.fn(),
}));

const auth = amplifyAuth as jest.Mocked<typeof amplifyAuth>;
function exception(name: string, message: string): Error {
	return Object.assign(new Error(message), { name });
}

const cognitoError = exception("SomeCognitoException", "Cognito said no");

describe("AuthManager", () => {
	let manager: AuthManager;

	beforeEach(() => {
		jest.resetAllMocks();
		manager = new AuthManager({ method: "email" });
	});

	it.each(["DONE", "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED", "RESET_PASSWORD"] as const)(
		"login returns Cognito's %s step",
		async (signInStep) => {
			const result = {
				isSignedIn: signInStep === "DONE",
				nextStep: { signInStep },
			} as amplifyAuth.SignInOutput;
			auth.signIn.mockResolvedValue(result);

			await expect(manager.login("name@example.com", "pw")).resolves.toEqual(result);
		},
	);

	it("configures Google OAuth when oauth options are given", () => {
		new AuthManager({
			method: "email",
			oauth: {
				domain: "auth.example.com",
				redirectSignIn: ["https://a/"],
				redirectSignOut: ["https://a/login"],
			},
		});

		expect(Amplify.configure).toHaveBeenLastCalledWith(
			expect.objectContaining({
				Auth: {
					Cognito: expect.objectContaining({
						loginWith: {
							oauth: expect.objectContaining({
								domain: "auth.example.com",
								providers: ["Google"],
							}),
						},
					}),
				},
			}),
		);
	});

	it("signs in with Google through a redirect", async () => {
		await manager.signInWithGoogle();

		expect(auth.signInWithRedirect).toHaveBeenCalledWith({ provider: "Google" });
	});

	it("sets a new password and returns Cognito's next step", async () => {
		auth.confirmSignIn.mockResolvedValue({ isSignedIn: true, nextStep: { signInStep: "DONE" } });

		await expect(manager.confirmNewPassword("new-pw")).resolves.toEqual({
			isSignedIn: true,
			nextStep: { signInStep: "DONE" },
		});
		expect(auth.confirmSignIn).toHaveBeenCalledWith({ challengeResponse: "new-pw" });
	});

	it("changes the password", async () => {
		await manager.changePassword("old", "new");

		expect(auth.updatePassword).toHaveBeenCalledWith({ oldPassword: "old", newPassword: "new" });
	});

	it("sends the name at signup when one is given", async () => {
		await manager.signup("name@example.com", "pw", "Ada Lovelace");

		expect(auth.signUp.mock.calls[0][0].options?.userAttributes).toStrictEqual({
			email: "name@example.com",
			name: "Ada Lovelace",
		});
	});

	it("sends only the email at signup when no name is given", async () => {
		await manager.signup("name@example.com", "pw");

		expect(auth.signUp.mock.calls[0][0].options?.userAttributes).toStrictEqual({
			email: "name@example.com",
		});
	});

	it("changes the name", async () => {
		await manager.changeName("Ada Lovelace");

		expect(auth.updateUserAttributes).toHaveBeenCalledWith({ userAttributes: { name: "Ada Lovelace" } });
	});

	const flows = [
		[
			"signInWithGoogle",
			(m: AuthManager) => m.signInWithGoogle(),
			auth.signInWithRedirect,
			ERROR_CODES.AUTH_GOOGLE_SIGN_IN_FAILED,
		],
		[
			"confirmNewPassword",
			(m: AuthManager) => m.confirmNewPassword("pw"),
			auth.confirmSignIn,
			ERROR_CODES.AUTH_NEW_PASSWORD_FAILED,
		],
		[
			"changePassword",
			(m: AuthManager) => m.changePassword("a", "b"),
			auth.updatePassword,
			ERROR_CODES.AUTH_PASSWORD_CHANGE_FAILED,
		],
		[
			"changeName",
			(m: AuthManager) => m.changeName("Ada"),
			auth.updateUserAttributes,
			ERROR_CODES.AUTH_NAME_CHANGE_FAILED,
		],
	] as const;

	it.each(flows)("%s raises its own error code when Cognito fails", async (_name, call, amplifyCall, code) => {
		(amplifyCall as jest.Mock).mockRejectedValue(cognitoError);

		await expect(call(manager)).rejects.toMatchObject({ name: "SdkError", code, details: cognitoError });
	});

	it.each(flows)("%s rejects API key auth without calling Cognito", async (_name, call, amplifyCall) => {
		const apiKeyManager = new AuthManager({ method: "apiKey", key: "k" });

		await expect(call(apiKeyManager)).rejects.toMatchObject({ code: ERROR_CODES.AUTH_UNSUPPORTED_METHOD });
		expect(amplifyCall).not.toHaveBeenCalled();
	});

	describe("messages for users", () => {
		const email = "name@example.com";
		const breached = exception(
			"InvalidPasswordException",
			"Provided password cannot be used for security reasons.",
		);

		it.each([
			[
				"sign-in with a required password reset",
				(m: AuthManager) => m.login(email, "pw"),
				auth.signIn,
				exception("PasswordResetRequiredException", "Password reset required for the user"),
				ERROR_CODES.AUTH_PASSWORD_RESET_REQUIRED,
				"Your password must be reset before you can sign in. Reset your password, then sign in.",
			],
			[
				"sign-in blocked for security reasons",
				(m: AuthManager) => m.login(email, "pw"),
				auth.signIn,
				exception("NotAuthorizedException", "Unable to login because of security reasons."),
				ERROR_CODES.AUTH_SIGN_IN_BLOCKED,
				"Your sign-in was blocked because this device or location was not recognized. Please reset your password.",
			],
			[
				"sign-in without a network",
				(m: AuthManager) => m.login(email, "pw"),
				auth.signIn,
				exception("NetworkError", "A network error has occurred."),
				ERROR_CODES.AUTH_NETWORK_ERROR,
				"Could not connect to the server. Check your internet connection, then try again.",
			],
			[
				"sign-up without a network",
				(m: AuthManager) => m.signup(email, "pw", "Ada"),
				auth.signUp,
				exception("NetworkError", "A network error has occurred."),
				ERROR_CODES.AUTH_NETWORK_ERROR,
				"Could not connect to the server. Check your internet connection, then try again.",
			],
			[
				"Google sign-in redirect failure",
				(m: AuthManager) => m.signInWithGoogle(),
				auth.signInWithRedirect,
				exception("UserAlreadyAuthenticatedException", "There is already a signed in user."),
				ERROR_CODES.AUTH_GOOGLE_SIGN_IN_FAILED,
				"We could not open the Google sign-in page. Please try again. If this issue persists, please contact Signaloid Support at developer-support@signaloid.com.",
			],
			[
				"Google sign-in without OAuth in the Amplify configuration",
				(m: AuthManager) => m.signInWithGoogle(),
				auth.signInWithRedirect,
				exception("OAuthNotConfigureException", "oauth param not configured."),
				ERROR_CODES.AUTH_GOOGLE_SIGN_IN_NOT_CONFIGURED,
				"Google sign-in is not available. Please sign in with your email and password.",
			],
			[
				"new password after the sign-in session expired",
				(m: AuthManager) => m.confirmNewPassword("pw"),
				auth.confirmSignIn,
				exception(
					"NotAuthorizedException",
					"Invalid session for the user, session is expired.",
				),
				ERROR_CODES.AUTH_NEW_PASSWORD_SESSION_EXPIRED,
				"Your sign-in session expired. Sign in again with your temporary password.",
			],
			[
				"sign-up with an existing email",
				(m: AuthManager) => m.signup(email, "pw", "Ada"),
				auth.signUp,
				exception("UsernameExistsException", "User already exists"),
				ERROR_CODES.AUTH_USER_EXISTS,
				"An account with this email already exists. Please use a different email or sign in.",
			],
			[
				"sign-up with a rejected password",
				(m: AuthManager) => m.signup(email, "pw", "Ada"),
				auth.signUp,
				breached,
				ERROR_CODES.AUTH_PASSWORD_REJECTED,
				"For security reasons, Signaloid cannot accept this password. Please choose a different one.",
			],
			[
				"password change with a rejected password",
				(m: AuthManager) => m.changePassword("old", "new"),
				auth.updatePassword,
				breached,
				ERROR_CODES.AUTH_PASSWORD_REJECTED,
				"For security reasons, Signaloid cannot accept this password. Please choose a different one.",
			],
			[
				"verifying a verified account",
				(m: AuthManager) => m.confirmSignup(email, "123456"),
				auth.confirmSignUp,
				exception(
					"NotAuthorizedException",
					"User cannot be confirmed. Current status is CONFIRMED",
				),
				ERROR_CODES.AUTH_ALREADY_CONFIRMED,
				"The account for name@example.com is already verified. You can sign in.",
			],
			[
				"password change with a required password reset",
				(m: AuthManager) => m.changePassword("old", "new"),
				auth.updatePassword,
				exception("PasswordResetRequiredException", ""),
				ERROR_CODES.AUTH_PASSWORD_RESET_REQUIRED,
				"Your password must be reset before you can change it. Reset your password, then sign in.",
			],
			[
				"password change with a wrong current password",
				(m: AuthManager) => m.changePassword("old", "new"),
				auth.updatePassword,
				exception("NotAuthorizedException", "Incorrect username or password."),
				ERROR_CODES.AUTH_INCORRECT_CURRENT_PASSWORD,
				"Your current password is incorrect.",
			],
		] as const)("%s", async (_case, call, amplifyCall, error, code, message) => {
			(amplifyCall as jest.Mock).mockRejectedValue(error);

			await expect(call(manager)).rejects.toMatchObject({ code, message });
		});

		it.each([
			[
				"a password policy violation",
				(m: AuthManager) => m.signup(email, "pw", "Ada"),
				auth.signUp,
				exception(
					"InvalidPasswordException",
					"Password does not conform to policy: Password not long enough",
				),
				ERROR_CODES.AUTH_PASSWORD_REJECTED,
			],
			[
				"a revoked session during a password change",
				(m: AuthManager) => m.changePassword("old", "new"),
				auth.updatePassword,
				exception("NotAuthorizedException", "Access Token has been revoked"),
				ERROR_CODES.AUTH_INCORRECT_CURRENT_PASSWORD,
			],
			[
				"a disabled user setting a new password",
				(m: AuthManager) => m.confirmNewPassword("pw"),
				auth.confirmSignIn,
				exception("NotAuthorizedException", "User is disabled."),
				ERROR_CODES.AUTH_NEW_PASSWORD_SESSION_EXPIRED,
			],
		] as const)("does not misreport %s", async (_case, call, amplifyCall, error, code) => {
			(amplifyCall as jest.Mock).mockRejectedValue(error);

			await expect(call(manager)).rejects.not.toMatchObject({ code });
		});

		it("returns a success message after verifying the account", async () => {
			await expect(manager.confirmSignup(email, "123456")).resolves.toEqual({
				message: "The account for name@example.com is verified. You can now sign in.",
			});
		});

		it("returns a success message after changing the name", async () => {
			await expect(manager.changeName("Ada")).resolves.toEqual({
				message: "Name updated successfully.",
			});
		});
	});

	describe("error codes the app can branch on", () => {
		const email = "name@example.com";

		const methods = [
			["login", (m: AuthManager) => m.login(email, "pw"), auth.signIn],
			["signup", (m: AuthManager) => m.signup(email, "pw", "Ada"), auth.signUp],
			["confirmSignup", (m: AuthManager) => m.confirmSignup(email, "123456"), auth.confirmSignUp],
			["resendSignUp", (m: AuthManager) => m.resendSignUp(email), auth.resendSignUpCode],
			["forgotPassword", (m: AuthManager) => m.forgotPassword(email), auth.resetPassword],
			[
				"forgotPasswordSubmit",
				(m: AuthManager) => m.forgotPasswordSubmit(email, "123456", "pw"),
				auth.confirmResetPassword,
			],
			["changePassword", (m: AuthManager) => m.changePassword("old", "new"), auth.updatePassword],
			["confirmNewPassword", (m: AuthManager) => m.confirmNewPassword("pw"), auth.confirmSignIn],
		] as const;

		const rateLimitErrors = [
			exception("TooManyRequestsException", "Too many requests."),
			exception("LimitExceededException", "Attempt limit exceeded, please try after some time."),
		];

		describe.each(methods)("%s", (_name, call, amplifyCall) => {
			it.each(rateLimitErrors)("reports $name as rate limited", async (error) => {
				(amplifyCall as jest.Mock).mockRejectedValue(error);

				await expect(call(manager)).rejects.toMatchObject({
					code: ERROR_CODES.AUTH_RATE_LIMITED,
					details: error,
				});
			});
		});

		const networkError = exception("NetworkError", "A network error has occurred.");

		it.each([
			["Google sign-in", (m: AuthManager) => m.signInWithGoogle(), auth.signInWithRedirect],
			[
				"confirming the account",
				(m: AuthManager) => m.confirmSignup(email, "123456"),
				auth.confirmSignUp,
			],
			[
				"resending the verification email",
				(m: AuthManager) => m.resendSignUp(email),
				auth.resendSignUpCode,
			],
			["requesting a reset code", (m: AuthManager) => m.forgotPassword(email), auth.resetPassword],
			[
				"submitting a password reset",
				(m: AuthManager) => m.forgotPasswordSubmit(email, "123456", "pw"),
				auth.confirmResetPassword,
			],
			[
				"changing the password",
				(m: AuthManager) => m.changePassword("old", "new"),
				auth.updatePassword,
			],
			["setting a new password", (m: AuthManager) => m.confirmNewPassword("pw"), auth.confirmSignIn],
		] as const)(
			"reports a lost connection while %s as a network error",
			async (_case, call, amplifyCall) => {
				(amplifyCall as jest.Mock).mockRejectedValue(networkError);

				await expect(call(manager)).rejects.toMatchObject({
					code: ERROR_CODES.AUTH_NETWORK_ERROR,
					details: networkError,
				});
			},
		);

		const breached = exception(
			"InvalidPasswordException",
			"Provided password cannot be used for security reasons.",
		);

		it.each([
			[
				"sign-up with a temporary email address as a rejected email",
				(m: AuthManager) => m.signup(email, "pw", "Ada"),
				auth.signUp,
				exception(
					"UserLambdaValidationException",
					"PreSignUp failed with error Temporary email addresses are not allowed. Please use a permanent email address.",
				),
				ERROR_CODES.AUTH_EMAIL_REJECTED,
			],
			[
				"sign-up with a malformed email as an invalid email",
				(m: AuthManager) => m.signup(email, "pw", "Ada"),
				auth.signUp,
				exception("InvalidParameterException", "Invalid email address format."),
				ERROR_CODES.AUTH_INVALID_EMAIL,
			],
			[
				"a reset code request for an unknown email as a missing user",
				(m: AuthManager) => m.forgotPassword(email),
				auth.resetPassword,
				exception("UserNotFoundException", "Username/client id combination not found."),
				ERROR_CODES.AUTH_USER_NOT_FOUND,
			],
			[
				"a reset code request for an unverified email as not confirmed",
				(m: AuthManager) => m.forgotPassword(email),
				auth.resetPassword,
				exception(
					"InvalidParameterException",
					"Cannot reset password for the user as there is no registered/verified email or phone_number",
				),
				ERROR_CODES.AUTH_NOT_CONFIRMED,
			],
			[
				"a password reset with a rejected password as a rejected password",
				(m: AuthManager) => m.forgotPasswordSubmit(email, "123456", "pw"),
				auth.confirmResetPassword,
				breached,
				ERROR_CODES.AUTH_PASSWORD_REJECTED,
			],
			[
				"a password reset with a wrong code as a code mismatch",
				(m: AuthManager) => m.forgotPasswordSubmit(email, "123456", "pw"),
				auth.confirmResetPassword,
				exception(
					"CodeMismatchException",
					"Invalid verification code provided, please try again.",
				),
				ERROR_CODES.AUTH_CODE_MISMATCH,
			],
			[
				"a password reset with an expired code as an expired code",
				(m: AuthManager) => m.forgotPasswordSubmit(email, "123456", "pw"),
				auth.confirmResetPassword,
				exception(
					"ExpiredCodeException",
					"Invalid code provided, please request a code again.",
				),
				ERROR_CODES.AUTH_CODE_EXPIRED,
			],
			[
				"a password reset for an unknown email as a missing user",
				(m: AuthManager) => m.forgotPasswordSubmit(email, "123456", "pw"),
				auth.confirmResetPassword,
				exception("UserNotFoundException", "Username/client id combination not found."),
				ERROR_CODES.AUTH_USER_NOT_FOUND,
			],
			[
				"a new password with a rejected password as a rejected password",
				(m: AuthManager) => m.confirmNewPassword("pw"),
				auth.confirmSignIn,
				breached,
				ERROR_CODES.AUTH_PASSWORD_REJECTED,
			],
			[
				"a password change with an expired session as an expired session",
				(m: AuthManager) => m.changePassword("old", "new"),
				auth.updatePassword,
				exception("NotAuthorizedException", "Access Token has expired"),
				ERROR_CODES.AUTH_EXPIRED_TOKEN,
			],
			[
				"a password change with a revoked session as an expired session",
				(m: AuthManager) => m.changePassword("old", "new"),
				auth.updatePassword,
				exception("NotAuthorizedException", "Access Token has been revoked"),
				ERROR_CODES.AUTH_EXPIRED_TOKEN,
			],
			[
				"a wrong password at sign-in as incorrect credentials",
				(m: AuthManager) => m.login(email, "pw"),
				auth.signIn,
				exception("NotAuthorizedException", "Incorrect username or password."),
				ERROR_CODES.AUTH_INCORRECT_CREDENTIALS,
			],
			[
				"a disabled user at sign-in as incorrect credentials",
				(m: AuthManager) => m.login(email, "pw"),
				auth.signIn,
				exception("NotAuthorizedException", "User is disabled."),
				ERROR_CODES.AUTH_INCORRECT_CREDENTIALS,
			],
			[
				"an unrecognized authorization failure at sign-in as a general failure",
				(m: AuthManager) => m.login(email, "pw"),
				auth.signIn,
				exception("NotAuthorizedException", "Something Cognito has not said before."),
				ERROR_CODES.AUTH_FAILED,
			],
			[
				"an unknown failure at sign-in as a general failure",
				(m: AuthManager) => m.login(email, "pw"),
				auth.signIn,
				exception("InternalErrorException", "An internal error occurred."),
				ERROR_CODES.AUTH_FAILED,
			],
		] as const)("reports %s", async (_case, call, amplifyCall, error, code) => {
			(amplifyCall as jest.Mock).mockRejectedValue(error);

			await expect(call(manager)).rejects.toMatchObject({ code, details: error });
		});

		it.each([
			[
				"a sign-up rejected by another validation rule",
				exception(
					"UserLambdaValidationException",
					"PreSignUp failed with error Something else.",
				),
				ERROR_CODES.AUTH_EMAIL_REJECTED,
			],
			[
				"a sign-up with an invalid parameter that is not the email",
				exception(
					"InvalidParameterException",
					"1 validation error detected: Value at 'password' failed",
				),
				ERROR_CODES.AUTH_INVALID_EMAIL,
			],
		] as const)("does not misreport %s", async (_case, error, code) => {
			auth.signUp.mockRejectedValue(error);

			await expect(manager.signup(email, "pw", "Ada")).rejects.not.toMatchObject({ code });
		});

		const policyViolation = exception(
			"InvalidPasswordException",
			"Password did not conform with policy: Password must have numeric characters",
		);

		it.each([
			[
				"a sign-up password that breaks the password policy",
				(m: AuthManager) => m.signup(email, "pw", "Ada"),
				auth.signUp,
				policyViolation,
				ERROR_CODES.AUTH_PASSWORD_POLICY,
				"Password must have numeric characters.",
			],
			[
				"a new password that breaks the password policy",
				(m: AuthManager) => m.confirmNewPassword("pw"),
				auth.confirmSignIn,
				policyViolation,
				ERROR_CODES.AUTH_PASSWORD_POLICY,
				"Password must have numeric characters.",
			],
			[
				"a reset password that breaks the password policy",
				(m: AuthManager) => m.forgotPasswordSubmit(email, "123456", "pw"),
				auth.confirmResetPassword,
				policyViolation,
				ERROR_CODES.AUTH_PASSWORD_POLICY,
				"Password must have numeric characters.",
			],
			[
				"a changed password that breaks the password policy",
				(m: AuthManager) => m.changePassword("old", "new"),
				auth.updatePassword,
				exception(
					"InvalidPasswordException",
					"Password does not conform to policy: Password not long enough",
				),
				ERROR_CODES.AUTH_PASSWORD_POLICY,
				"Password not long enough.",
			],
			[
				"a policy violation without Cognito's prefix",
				(m: AuthManager) => m.signup(email, "pw", "Ada"),
				auth.signUp,
				exception("InvalidPasswordException", "Password must have uppercase characters."),
				ERROR_CODES.AUTH_PASSWORD_POLICY,
				"Password must have uppercase characters.",
			],
			[
				"a sign-up the pre-sign-up check rejects with its own reason",
				(m: AuthManager) => m.signup(email, "pw", "Ada"),
				auth.signUp,
				exception(
					"UserLambdaValidationException",
					"PreSignUp failed with error Only approved email addresses are allowed.",
				),
				ERROR_CODES.AUTH_SIGNUP_REJECTED,
				"Only approved email addresses are allowed.",
			],
			[
				"a pre-sign-up rejection written as a lowercase fragment as a sentence",
				(m: AuthManager) => m.signup(email, "pw", "Ada"),
				auth.signUp,
				exception(
					"UserLambdaValidationException",
					"PreSignUp failed with error sign-ups are closed",
				),
				ERROR_CODES.AUTH_SIGNUP_REJECTED,
				"Sign-ups are closed.",
			],
		] as const)("tells the user why for %s", async (_case, call, amplifyCall, error, code, message) => {
			(amplifyCall as jest.Mock).mockRejectedValue(error);

			await expect(call(manager)).rejects.toMatchObject({ code, message, details: error });
		});
	});

	describe("the authorization header for email auth", () => {
		function jwt(payload: amplifyAuth.JWT["payload"], token: string): amplifyAuth.JWT {
			return { payload, toString: () => token };
		}

		const accessToken = jwt({}, "access-token");

		function secondsAgo(seconds: number): number {
			return Math.floor(Date.now() / 1000) - seconds;
		}

		it.each([
			["10 minutes", 10 * 60],
			["two hours", 2 * 60 * 60],
		])(
			"sends the ID token Amplify returns even when it expired %s ago by the device clock",
			async (_ago, seconds) => {
				auth.fetchAuthSession.mockResolvedValue({
					tokens: { idToken: jwt({ exp: secondsAgo(seconds) }, "id-token"), accessToken },
				});

				await expect(manager.getAuthorizationHeader()).resolves.toBe("Bearer id-token");
			},
		);

		it.each([
			["no ID token", {}],
			["an ID token without an expiry", { tokens: { idToken: jwt({}, "id-token"), accessToken } }],
		])("rejects a session with %s as an invalid token", async (_case, session) => {
			auth.fetchAuthSession.mockResolvedValue(session);

			await expect(manager.getAuthorizationHeader()).rejects.toMatchObject({
				code: ERROR_CODES.AUTH_INVALID_TOKEN,
			});
		});

		it("reports Amplify failing to fetch the session as a failed session", async () => {
			const error = new Error("Amplify failed");
			auth.fetchAuthSession.mockRejectedValue(error);

			await expect(manager.getAuthorizationHeader()).rejects.toMatchObject({
				code: ERROR_CODES.AUTH_SESSION_FAILED,
				details: error,
			});
		});
	});
});
