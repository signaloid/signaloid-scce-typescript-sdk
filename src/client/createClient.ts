import { SignaloidClient } from "./SignaloidClient";
import { AuthOptions, ClientOptions } from "../types";

export function createClient(
  auth: AuthOptions,
  options?: Partial<ClientOptions>,
) {
  return new SignaloidClient(auth, options);
}
