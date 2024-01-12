import { Buffer } from "buffer";

// convert base64 to blob
const base64ToBlob = (base64: string): Uint8Array => {
  const buffer = Buffer.from(base64, "base64");

  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
};

export { base64ToBlob };
