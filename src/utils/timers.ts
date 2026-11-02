export function unrefTimer(timer: ReturnType<typeof setTimeout>): ReturnType<typeof setTimeout> {
	(timer as any)?.unref?.();
	return timer;
}
