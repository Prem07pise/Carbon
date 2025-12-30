import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body || {};

    if (!name || !email || !message) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // For now, store to a simple file or in-memory store could be used.
    // As we don't have a backend DB here, we'll append to a local file (server-side only).
    // NOTE: This will only work in Node (won't persist on some serverless environments).
    try {
      const fs = await import('fs');
      const path = await import('path');
      const dataPath = path.join(process.cwd(), 'contacts.json');
      const entry = { id: Date.now(), name, email, subject: subject || '', message, createdAt: new Date().toISOString() };
      let arr = [];
      try {
        if (fs.existsSync(dataPath)) {
          const raw = fs.readFileSync(dataPath, 'utf8');
          arr = JSON.parse(raw || '[]');
        }
      } catch (e) {
        // ignore
      }
      arr.push(entry);
      fs.writeFileSync(dataPath, JSON.stringify(arr, null, 2), 'utf8');
    } catch (err) {
      // If filesystem access not available, just log
      console.warn('Could not write contact to file:', err?.message || err);
    }

    return NextResponse.json({ success: true, data: { received: true } });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
