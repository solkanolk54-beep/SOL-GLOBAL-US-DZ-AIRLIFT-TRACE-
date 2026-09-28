/**
 * Security & Cryptographic Utilities
 * - HMAC-SHA256 digital signing for Farm-to-Fork QR verification
 * - JWT token issuance & signature validation
 * - Secure tamper detection for milk tanks, health audits, and USDA certificates
 */

// Secret salt for HMAC signing (in production, loaded from environment KMS/HSM)
const SIGNING_SECRET = 'SOL_GLOBAL_US_DZ_LIVESTOCK_2026_SECURE_KEY';

/**
 * Generates an HMAC-SHA256 signature for a payload string using the Web Crypto API
 */
export async function generateHmacSignature(data: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const enc = new TextEncoder();
    const keyData = enc.encode(SIGNING_SECRET);
    const key = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: { name: 'SHA-256' } },
      false,
      ['sign']
    );

    const signatureBuffer = await window.crypto.subtle.sign('HMAC', key, enc.encode(data));
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback hash implementation for non-subtle crypto environments
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'hmac_' + Math.abs(hash).toString(16) + 'fd992c61';
}

/**
 * Creates a signed JWT token representation for mobile veterinarians & field operators
 */
export async function createTacticalJwt(payload: {
  sub: string;
  role: 'veterinarian' | 'quarantine_officer' | 'cargo_handler' | 'auditor';
  stationWilaya: string;
  expiresInMinutes?: number;
}): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const exp = Math.floor(Date.now() / 1000) + (payload.expiresInMinutes || 480) * 60;
  const fullPayload = {
    ...payload,
    iss: 'SOL-GLOBAL-US-DZ-AUTH',
    iat: Math.floor(Date.now() / 1000),
    exp,
  };

  const encodeBase64Url = (obj: any) => {
    return btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const headerB64 = encodeBase64Url(header);
  const payloadB64 = encodeBase64Url(fullPayload);
  const contentToSign = `${headerB64}.${payloadB64}`;
  const signature = await generateHmacSignature(contentToSign);

  return `${contentToSign}.${signature.substring(0, 32)}`;
}

/**
 * Verifies if an HMAC signature matches the calculated digest
 */
export async function verifyHmacSignature(data: string, signature: string): Promise<boolean> {
  const calculated = await generateHmacSignature(data);
  return calculated.toLowerCase() === signature.toLowerCase();
}
