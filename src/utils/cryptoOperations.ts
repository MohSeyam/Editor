export interface EncryptionPackage {
  header: {
    magic: string;
    version: number;
    filename: string;
    mimeType: string;
    permissions: {
      preventPrinting: boolean;
      preventCopying: boolean;
      preventModifying: boolean;
    };
    created: string;
  };
  salt: string;
  iv: string;
  ciphertext: string;
}

const BINARY_MAGIC = new Uint8Array([79, 70, 76, 79, 67, 75, 48, 50]); // 'OFLOCK02'
const LEGACY_MAGIC = 'OFFICE_LOCK_SECURE';

/**
 * Fast, zero-copy binary encryption using Web Crypto API (AES-256-GCM + PBKDF2).
 * Works instantaneously even for multi-megabyte documents without freezing the thread.
 */
export async function encryptFileLocal(
  data: Uint8Array,
  filename: string,
  mimeType: string,
  password: string,
  permissions: {
    preventPrinting: boolean;
    preventCopying: boolean;
    preventModifying: boolean;
  }
): Promise<Blob> {
  const enc = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Generate cryptographic 16-byte salt and 12-byte IV for AES-GCM
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Derive AES-GCM 256-bit key with 100,000 PBKDF2 iterations
  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  // Encrypt the payload data
  // Ensure buffer source is clean
  const bufferToEncrypt = data.byteOffset === 0 && data.byteLength === data.buffer.byteLength
    ? data.buffer
    : data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    bufferToEncrypt
  );

  // Prepare binary metadata
  const metaJson = JSON.stringify({
    filename,
    mimeType: mimeType || 'application/octet-stream',
    permissions,
    created: new Date().toISOString(),
  });
  const metaBytes = enc.encode(metaJson);
  const metaLen = metaBytes.byteLength;

  // Permission flags byte: bit0 = preventPrinting, bit1 = preventCopying, bit2 = preventModifying
  let permByte = 0;
  if (permissions.preventPrinting) permByte |= 1;
  if (permissions.preventCopying) permByte |= 2;
  if (permissions.preventModifying) permByte |= 4;

  const metaLenBuffer = new ArrayBuffer(4);
  new DataView(metaLenBuffer).setUint32(0, metaLen, false);

  // Build binary container blob directly without base64 overhead
  return new Blob(
    [
      BINARY_MAGIC,
      salt,
      iv,
      new Uint8Array([permByte]),
      new Uint8Array(metaLenBuffer),
      metaBytes,
      encryptedBuffer,
    ],
    { type: 'application/octet-stream' }
  );
}

/**
 * Decrypts a locked file using AES-256-GCM and PBKDF2.
 * Supports both modern binary OFLOCK02 format and legacy JSON package format.
 */
export async function decryptFileLocal(
  lockedData: Uint8Array,
  password: string
): Promise<{ data: Uint8Array; filename: string; mimeType: string; permissions?: any }> {
  if (lockedData.length < 40) {
    throw new Error('حجم الملف صغير جداً ولا يحتوي على ترويسة تشفير صالحة');
  }

  // 1. Check if binary OFLOCK02 format
  let isBinary = true;
  for (let i = 0; i < BINARY_MAGIC.length; i++) {
    if (lockedData[i] !== BINARY_MAGIC[i]) {
      isBinary = false;
      break;
    }
  }

  if (isBinary) {
    let offset = BINARY_MAGIC.length; // 8
    const salt = lockedData.slice(offset, offset + 16);
    offset += 16;
    const iv = lockedData.slice(offset, offset + 12);
    offset += 12;
    const permByte = lockedData[offset];
    offset += 1;

    const dataView = new DataView(lockedData.buffer, lockedData.byteOffset + offset, 4);
    const metaLen = dataView.getUint32(0, false);
    offset += 4;

    const metaBytes = lockedData.slice(offset, offset + metaLen);
    offset += metaLen;

    const metaText = new TextDecoder('utf-8').decode(metaBytes);
    let meta: any = {};
    try {
      meta = JSON.parse(metaText);
    } catch {
      // Fallback
    }

    const ciphertext = lockedData.slice(offset);

    // Derive key
    const enc = new TextEncoder();
    const passwordKey = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const aesKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    try {
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        ciphertext
      );

      return {
        data: new Uint8Array(decryptedBuffer),
        filename: meta.filename || 'unlocked_file',
        mimeType: meta.mimeType || 'application/octet-stream',
        permissions: {
          preventPrinting: Boolean(permByte & 1),
          preventCopying: Boolean(permByte & 2),
          preventModifying: Boolean(permByte & 4),
        },
      };
    } catch {
      throw new Error('كلمة المرور غير صحيحة، أو تم تعديل محتوى الملف المشفر');
    }
  }

  // 2. Legacy JSON fallback
  const dec = new TextDecoder();
  let jsonString: string;
  try {
    jsonString = dec.decode(lockedData);
  } catch {
    throw new Error('الملف المحدد ليس بصيغة مشفرة صالحة');
  }

  let pkg: EncryptionPackage;
  try {
    pkg = JSON.parse(jsonString);
  } catch {
    throw new Error('الملف المحدد ليس ملفاً مشفراً صالحاً');
  }

  if (pkg.header?.magic !== LEGACY_MAGIC) {
    throw new Error('تنسيق ملف التشفير غير مدعوم');
  }

  const salt = fastBase64ToArrayBuffer(pkg.salt);
  const iv = fastBase64ToArrayBuffer(pkg.iv);
  const ciphertext = fastBase64ToArrayBuffer(pkg.ciphertext);

  const enc = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      ciphertext
    );

    return {
      data: new Uint8Array(decryptedBuffer),
      filename: pkg.header.filename || 'unlocked_file',
      mimeType: pkg.header.mimeType || 'application/octet-stream',
      permissions: pkg.header.permissions,
    };
  } catch {
    throw new Error('كلمة المرور غير صحيحة، أو تم تعديل محتوى الملف المشفر');
  }
}

function fastBase64ToArrayBuffer(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Checks if file bytes match the locked format signature
 */
export function isLockedFile(data: Uint8Array): boolean {
  if (!data || data.length < 40) return false;
  let isBinary = true;
  for (let i = 0; i < BINARY_MAGIC.length; i++) {
    if (data[i] !== BINARY_MAGIC[i]) {
      isBinary = false;
      break;
    }
  }
  if (isBinary) return true;
  try {
    const text = new TextDecoder('utf-8').decode(data.slice(0, 120));
    return text.includes(LEGACY_MAGIC);
  } catch {
    return false;
  }
}

/**
 * Quick password verification without crashing
 */
export async function verifyLockedFilePassword(
  lockedData: Uint8Array,
  password: string
): Promise<{ valid: boolean; error?: string; result?: { data: Uint8Array; filename: string; mimeType: string } }> {
  if (!password) {
    return { valid: false, error: 'أدخل كلمة المرور' };
  }
  try {
    const res = await decryptFileLocal(lockedData, password);
    return { valid: true, result: res };
  } catch (err: any) {
    return { valid: false, error: err.message || 'كلمة المرور غير صحيحة' };
  }
}
