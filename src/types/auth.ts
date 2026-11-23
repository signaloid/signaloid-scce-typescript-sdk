import type { SignInOutput } from "@aws-amplify/auth";

export type OAuthOptions = {
	/** The Cognito hosted UI domain, such as "auth.signaloid.io". */
	domain: string;
	redirectSignIn: string[];
	redirectSignOut: string[];
};

/** `nextStep` tells the client what Cognito asks for next, such as a new password, when `isSignedIn` is false. */
export type LoginResult = SignInOutput;
