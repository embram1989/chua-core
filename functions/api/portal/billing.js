/**
 * Cloudflare Pages Function: /api/portal/billing
 * Edge-safe billing and QRIS endpoint for Portal Wali Murid using Firebase Firestore REST API.
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
      throw new Error(`Google OAuth token exchange failed (${tokenResponse.status}): ${errText}`);
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  } catch (err) {
    throw new Error(`Auth Error: ${err.message}`);
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
 * POST /api/portal/billing
 * Accepts { studentId, tenantId }
 */
export async function onRequestPost(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    const { request, env = {} } = context;

    const projectId = env.FIREBASE_PROJECT_ID || 'ai-studio-chuasportcorespo-a3f4ecd8-7371-486a-9e89-d74d93ce6065';
    const databaseId = env.FIREBASE_DATABASE_ID || 'ai-studio-chuasportcorespo-a3f4ecd8-7371-486a-9e89-d74d93ce6065';
    const clientEmail = env.FIREBASE_CLIENT_EMAIL || '';
    const privateKey = env.FIREBASE_PRIVATE_KEY ? env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : '';

    const body = await request.json().catch(() => ({}));
    let { studentId, tenantId } = body;

    if (!studentId && !tenantId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Parameter studentId atau tenantId diperlukan.' 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Dapatkan Access Token Service Account
    let accessToken = null;
    try {
      accessToken = await getGoogleAccessToken(clientEmail, privateKey);
    } catch (tokenErr) {
      console.warn('Google Auth token error:', tokenErr.message);
    }

    const reqHeaders = {
      'Content-Type': 'application/json'
    };
    if (accessToken) {
      reqHeaders['Authorization'] = `Bearer ${accessToken}`;
    }

    let studentData = null;

    // 2. Jika tenantId belum ada di request, baca langsung dokumen student
    if (!tenantId && studentId) {
      try {
        const studentUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/students/${encodeURIComponent(String(studentId).trim())}`;
        const studentResp = await fetch(studentUrl, { method: 'GET', headers: reqHeaders });
        if (studentResp.ok) {
          const studentDoc = await studentResp.json();
          studentData = parseFirestoreFields(studentDoc.fields);
          tenantId = studentData.tenantId;
        }
      } catch (err) {
        console.warn('Gagal membaca data siswa untuk tenantId:', err);
      }
    }

    // 3. Ambil data tenant untuk mendapatkan QRIS dan Info Rekening
    let tenantInfo = {
      id: tenantId || '',
      name: '',
      qrisUrl: null,
      bankName: '',
      bankAccount: '',
      accountHolder: ''
    };

    if (tenantId) {
      try {
        const tenantUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/tenants/${encodeURIComponent(String(tenantId).trim())}`;
        const tenantResp = await fetch(tenantUrl, { method: 'GET', headers: reqHeaders });
        if (tenantResp.ok) {
          const tenantDoc = await tenantResp.json();
          const tFields = parseFirestoreFields(tenantDoc.fields);
          tenantInfo = {
            id: tenantId,
            name: tFields.name || tFields.arenaName || '',
            qrisUrl: tFields.qrisUrl || tFields.qrisImageUrl || tFields.qrisImageBase64 || null,
            bankName: tFields.bankName || tFields.bank || '',
            bankAccount: tFields.bankAccount || tFields.noRekening || tFields.accountNumber || '',
            accountHolder: tFields.accountHolder || tFields.atasNama || ''
          };
        }
      } catch (err) {
        console.warn('Gagal mengambil data tenant:', err);
      }
    }

    // 4. Kueri Histori Pembayaran Siswa dari koleksi 'spp_payments' dan 'transactions'
    let paymentHistory = [];
    if (studentId) {
      try {
        // Coba kueri spp_payments
        const sppQueryPayload = {
          structuredQuery: {
            from: [{ collectionId: 'spp_payments' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'studentId' },
                op: 'EQUAL',
                value: { stringValue: String(studentId).trim() }
              }
            },
            limit: 10
          }
        };

        const sppQueryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:runQuery`;
        const sppResp = await fetch(sppQueryUrl, {
          method: 'POST',
          headers: reqHeaders,
          body: JSON.stringify(sppQueryPayload)
        });

        if (sppResp.ok) {
          const sppResults = await sppResp.json();
          const docs = (Array.isArray(sppResults) ? sppResults : []).filter((item) => item.document);
          paymentHistory = docs.map((d) => {
            const id = (d.document.name || '').split('/').pop();
            const f = parseFirestoreFields(d.document.fields);
            return { id, ...f };
          });
        }

        // Jika spp_payments kosong, periksa riwayat di koleksi transactions
        if (paymentHistory.length === 0) {
          const txQueryPayload = {
            structuredQuery: {
              from: [{ collectionId: 'transactions' }],
              where: {
                fieldFilter: {
                  field: { fieldPath: 'studentId' },
                  op: 'EQUAL',
                  value: { stringValue: String(studentId).trim() }
                }
              },
              limit: 10
            }
          };

          const txResp = await fetch(sppQueryUrl, {
            method: 'POST',
            headers: reqHeaders,
            body: JSON.stringify(txQueryPayload)
          });

          if (txResp.ok) {
            const txResults = await txResp.json();
            const docs = (Array.isArray(txResults) ? txResults : []).filter((item) => item.document);
            paymentHistory = docs.map((d) => {
              const id = (d.document.name || '').split('/').pop();
              const f = parseFirestoreFields(d.document.fields);
              return { id, ...f };
            });
          }
        }
      } catch (err) {
        console.warn('Gagal membaca riwayat pembayaran:', err);
      }
    }

    // 5. Hitung status tagihan bulan ini
    const currentMonth = new Date().toISOString().slice(0, 7); // Format "YYYY-MM"
    const lastPaidMonth = studentData?.lastPaidMonth || '';
    const isPaidThisMonth = lastPaidMonth === currentMonth;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Data penagihan berhasil dimuat',
        tenant: tenantInfo,
        billing: {
          monthlyFee: studentData?.monthlyFee || 350000,
          currentMonth,
          lastPaidMonth,
          isPaidThisMonth,
          statusText: isPaidThisMonth ? 'LUNAS BULAN INI' : 'MENUNGGU PEMBAYARAN'
        },
        paymentHistory
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Portal Billing API Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Terjadi kesalahan internal',
        details: error.stack || error.message
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}
