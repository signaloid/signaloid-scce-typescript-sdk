import { getEnvironment } from "../config/environment";
import { CognitoOverrides, OAuthOptions } from "../types";

/** Cognito settings for Amplify, read on each call so that SIGNALOID_ENV_VARS set after import apply. */
export function getAwsConfig(overrides?: CognitoOverrides) {
	const pool = overrides ?? getEnvironment();

	return {
		Auth: {
			Cognito: {
				userPoolId: pool.userPoolId,
				userPoolClientId: pool.userPoolClientId,
			},
		},
	};
}

/** The Amplify `loginWith.oauth` block for Google sign-in through the Cognito hosted UI. */
export function googleOAuthConfig(oauth: OAuthOptions) {
	return {
		domain: oauth.domain,
		scopes: ["openid", "email", "profile", "aws.cognito.signin.user.admin"],
		redirectSignIn: oauth.redirectSignIn,
		redirectSignOut: oauth.redirectSignOut,
		responseType: "code" as const,
		providers: ["Google" as const],
	};
}

/** Amplify configuration for email and Google sign-in on the given pool, or the environment's. */
export function awsConfigWithOAuth(oauth: OAuthOptions, overrides?: CognitoOverrides) {
	return {
		Auth: {
			Cognito: {
				...getAwsConfig(overrides).Auth.Cognito,
				loginWith: { oauth: googleOAuthConfig(oauth) },
			},
		},
	};
}
