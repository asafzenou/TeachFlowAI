export function parseSseFrames(buffer) {
  const normalized = buffer.replace(/\r\n/g, '\n');
  const boundary = normalized.indexOf('\n\n');
  if (boundary < 0) {
    return { frames: [], remainder: normalized };
  }
  const frame = normalized.slice(0, boundary);
  const rest = normalized.slice(boundary + 2);
  const event = frame.match(/^event:\s*(.+)$/m)?.[1]?.trim() || 'message';
  const payload = frame
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n');
  const next = parseSseFrames(rest);
  return {
    frames: [{ event, payload }, ...next.frames],
    remainder: next.remainder,
  };
}
export async function consumeSse(stream, onEvent) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      pending += decoder.decode(value || new Uint8Array(), { stream: !done });
      const parsed = parseSseFrames(pending);
      pending = parsed.remainder;
      for (const frame of parsed.frames) {
        let data = {};
        try {
          data = frame.payload ? JSON.parse(frame.payload) : {};
        } catch {
          throw new Error('Received an invalid tutor stream event.');
        }
        onEvent(frame.event, data);
      }
      if (done) {
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
