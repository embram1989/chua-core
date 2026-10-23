export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { studentId, parentPhone } = body;
    
    // TODO: Logika kueri Firestore menggunakan kredensial env akan diimplementasikan di sini
    
    return new Response(JSON.stringify({ success: true, message: "API Portal Terhubung", received: { studentId, parentPhone } }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
}
