declare const __BROWSER__: boolean;

export let WSClass: any;
export let hasNodeTerminate = false;
export let hasNodeRemoveAllListeners = false;

const RUNTIME_IS_BROWSER =
  typeof window !== "undefined" &&
  typeof (window as any).WebSocket !== "undefined";

const isBrowser =
  typeof __BROWSER__ !== "undefined" ? __BROWSER__ : RUNTIME_IS_BROWSER;

if (isBrowser) {
  // Browser: use the global WebSocket
  WSClass = (globalThis as any).WebSocket;
} else {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const wsMod = require("ws");
  WSClass = wsMod?.default ?? wsMod;
  hasNodeTerminate = true;
  hasNodeRemoveAllListeners = true;
}
