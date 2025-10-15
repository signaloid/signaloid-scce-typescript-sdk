import { getEnvironment } from "../config/environment";

const env = getEnvironment();

export const DEFAULT_ENDPOINTS = {
  api: env.api,
  websocket: env.websocket,
  host: env.host,
};
