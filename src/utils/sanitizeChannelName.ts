export function sanitizeChannelName(name: string): string {
  return name.replace(/usr_([a-f0-9]{32})/, "$1");
}
