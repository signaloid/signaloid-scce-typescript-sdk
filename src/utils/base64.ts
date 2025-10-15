export function encodeBase64URL(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  let b64: string;
  if (typeof Buffer !== "undefined") {
    b64 = Buffer.from(bytes).toString("base64");
  } else {
    b64 = window.btoa(binary);
  }

  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
