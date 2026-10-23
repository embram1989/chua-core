/**
 * Cloudflare Pages Function: /api/portal/login
 * Edge-safe authentication endpoint for Portal Wali Murid using Firebase Firestore REST API.
 */

// Helper to convert PEM private key to ArrayBuffer for Web Crypto API
function pemToArrayBuffer(pem) {
  const b64 = pem
    .replace(/-----BEGIN [A-Z0-9 ]+-----/g, '')
    .replace(/-----END [A-Z0-9 ]+-----/g, '')
    .replace(/[\r\n\s]+/g, '');
  const binaryString = atob(b64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Base64URL string encoder
function base64UrlEncode(str) {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// ArrayBuffer to Base64URL encoder
function bufferToBase64Url(buf) {
  const binStr = String.fromCharCode(...new Uint8Array(buf));
  return btoa(binStr)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generate Google OAuth2 Access Token using RS256 Web Crypto in Edge runtime
 */
async function getGoogleAccessToken(clientEmail, privateKeyPem) {
  if (!clientEmail || !privateKeyPem) return null;

  try {
    const cleanPem = privateKeyPem.replace(/\\n/g, '\n').trim();
    const keyBuffer = pemToArrayBuffer(cleanPem);

    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      keyBuffer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: { name: 'SHA-256' }
      },
      false,
      ['sign']
    );

    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claimSet = {
      iss: clientEmail,
      sub: clientEmail,
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
      scope: 'https://www.googleapis.com/auth/datastore'
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedClaims = base64UrlEncode(JSON.stringify(claimSet));
    const unsignedToken = `${encodedHeader}.${encodedClaims}`;

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      new TextEncoder().encode(unsignedToken)
    );

    const signedJwt = `${unsignedToken}.${bufferToBase64Url(signature)}`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: signedJwt
      })
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.warn('Google OAuth token exchange failed:', errText);
      return null;
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  } catch (err) {
    console.warn('Error signing Google Service Account token:', err);
    return null;
  }
}

/**
 * Unwraps Firestore typed values into standard JS primitives/objects
 */
function parseFirestoreValue(val) {
  if (!val || typeof val !== 'object') return val;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return val.booleanValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map(parseFirestoreValue);
  }
  if ('mapValue' in val) {
    return parseFirestoreFields(val.mapValue.fields);
  }
  return Object.values(val)[0];
}

function parseFirestoreFields(fields) {
  if (!fields) return {};
  const result = {};
  for (const [key, val] of Object.entries(fields)) {
    result[key] = parseFirestoreValue(val);
  }
  return result;
}

/**
 * Generates telephone number format permutations (with/without hyphens, leading 0, +62, 62)
 */
function generatePhoneVariations(phone) {
  if (!phone || typeof phone !== 'string') return [];
  const raw = phone.trim();
  const digitsOnly = raw.replace(/\D/g, '');
  const variations = new Set();

  variations.add(raw);
  if (digitsOnly) {
    variations.add(digitsOnly);
    if (digitsOnly.startsWith('0')) {
      const withoutZero = digitsOnly.slice(1);
      variations.add('62' + withoutZero);
      variations.add('+62' + withoutZero);
      // Format hipotesis dengan strip: 0812-3456-7890
      if (digitsOnly.length >= 10) {
        variations.add(`${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4, 8)}-${digitsOnly.slice(8)}`);
        variations.add(`${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 7)}-${digitsOnly.slice(7)}`);
      }
    } else if (digitsOnly.startsWith('62')) {
      const national = '0' + digitsOnly.slice(2);
      variations.add(national);
      variations.add('+' + digitsOnly);
    }
  }
  return Array.from(variations).slice(0, 25);
}

// OPTIONS CORS Preflight handler
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}

/**
 * POST /api/portal/login
 */
export async function onRequestPost(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    const { request, env = {} } = context;

    // 1. Ekstrak kredensial dari environment Cloudflare
    const projectId = env.FIREBASE_PROJECT_ID || 'ai-studio-chuasportcorespo-a3f4ecd8-7371-486a-9e89-d74d93ce6065';
    const clientEmail = env.FIREBASE_CLIENT_EMAIL || '';
    const privateKey = env.FIREBASE_PRIVATE_KEY ? env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : '';

    // 2. Ekstrak request body
    const body = await request.json().catch(() => ({}));
    const { studentId, parentPhone } = body;

    if (!studentId || !parentPhone) {
      return new Response(
        JSON.stringify({ success: false, message: 'Kredensial tidak ditemukan' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const cleanStudentId = String(studentId).trim();
    const cleanParentPhone = String(parentPhone).trim();
    const inputDigits = cleanParentPhone.replace(/\D/g, '');

    // 3. Dapatkan Access Token (jika kredensial Service Account tersedia)
    const accessToken = await getGoogleAccessToken(clientEmail, privateKey);

    const reqHeaders = {
      'Content-Type': 'application/json'
    };
    if (accessToken) {
      reqHeaders['Authorization'] = `Bearer ${accessToken}`;
    }

    // 4. Bangun kueri Firestore REST API (:runQuery) untuk mencari parentPhone di koleksi students
    const phoneVariations = generatePhoneVariations(cleanParentPhone);

    const queryPayload = {
      structuredQuery: {
        from: [{ collectionId: 'students' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'parentPhone' },
            op: phoneVariations.length > 1 ? 'IN' : 'EQUAL',
            value: phoneVariations.length > 1
              ? { arrayValue: { values: phoneVariations.map((p) => ({ stringValue: p })) } }
              : { stringValue: phoneVariations[0] }
          }
        }
      }
    };

    const runQueryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;

    const firestoreResponse = await fetch(runQueryUrl, {
      method: 'POST',
      headers: reqHeaders,
      body: JSON.stringify(queryPayload)
    });

    let matchedStudent = null;

    if (firestoreResponse.ok) {
      const queryResults = await firestoreResponse.json();
      const documents = (Array.isArray(queryResults) ? queryResults : []).filter((item) => item.document);

      // Filter di dalam kode Cloudflare untuk memastikan Document ID diawali dengan input studentId (case-insensitive)
      for (const item of documents) {
        const docName = item.document.name || '';
        const docId = docName.split('/').pop() || '';
        const fields = parseFirestoreFields(item.document.fields);
        const doc = { id: docId, ...fields };

        // Pencocokan Document ID case-insensitive
        if (doc.id.toLowerCase().startsWith(studentId.toLowerCase())) {
          matchedStudent = doc;
          break;
        }
      }
    } else {
      console.warn('Firestore runQuery returned status:', firestoreResponse.status);
    }

    // Fallback sekunder: Jika runQuery belum menemukan (misal format nomor HP tersimpan dengan spasi khusus),
    // coba periksa langsung dokumen ber-ID studentId via Firestore REST GET
    if (!matchedStudent && cleanStudentId.length >= 3) {
      try {
        const getDocUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/students/${encodeURIComponent(cleanStudentId)}`;
        const directDocResp = await fetch(getDocUrl, {
          method: 'GET',
          headers: reqHeaders
        });

        if (directDocResp.ok) {
          const docData = await directDocResp.json();
          const docId = (docData.name || '').split('/').pop() || cleanStudentId;
          const fields = parseFirestoreFields(docData.fields);
          const docPhone = String(fields.parentPhone || '').replace(/\D/g, '');

          // Cocokkan digit nomor HP dan kecocokan ID case-insensitive
          if (
            docId.toLowerCase().startsWith(studentId.toLowerCase()) &&
            docPhone &&
            inputDigits &&
            (docPhone.endsWith(inputDigits) || inputDigits.endsWith(docPhone))
          ) {
            matchedStudent = {
              id: docId,
              ...fields
            };
          }
        }
      } catch (err) {
        console.warn('Direct document fetch fallback error:', err);
      }
    }

    // 5. Kembalikan Respons sesuai hasil autentikasi
    if (matchedStudent) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Autentikasi berhasil',
          student: matchedStudent
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Jika tidak valid atau data kosong
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Kredensial tidak ditemukan'
      }),
      { status: 401, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Portal Login API Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Kredensial tidak ditemukan',
        error: error.message
      }),
      { status: 401, headers: corsHeaders }
    );
  }
}
