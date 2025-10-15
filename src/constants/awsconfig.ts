import { getEnvironment } from "../config/environment";

const env = getEnvironment();

export const AwsConfig = {
  Auth: {
    Cognito: {
      userPoolId: env.userPoolId,
      userPoolClientId: env.userPoolClientId,
    },
  },
};
