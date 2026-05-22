import crypto from 'crypto';

export type CentralUser = {
  userid: string;
  email?: string;
  name?: string;
};

export function getCentralUserFromAuthHeader(authHeader?: string | null): CentralUser | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();

  try {
    const secret = process.env.CENTRAL_AUTH_JWT_SECRET || '';
    if (!secret) return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify HMAC-SHA256 signature
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(`${headerB64}.${payloadB64}`);
    const expectedSignature = hmac.digest('base64url');

    if (signatureB64 !== expectedSignature) {
      return null;
    }

    // Decode payload
    const payloadJson = Buffer.from(payloadB64, 'base64').toString('utf8');
    const decoded = JSON.parse(payloadJson);

    const userid = decoded?.userid || decoded?.user_id || decoded?.userId || decoded?.sub;
    if (!userid) return null;

    return {
      userid,
      email: decoded?.email ?? null,
      name: decoded?.name ?? 'User',
    };
  } catch {
    return null;
  }
}
