function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function clean(value, max = 4000) {
  return String(value || '').trim().slice(0, max);
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'access-control-max-age': '86400'
    }
  });
}

export async function onRequestGet() {
  return json({ ok: false, error: 'Use POST.' }, 405);
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.RESEND_API_KEY || !env.CONTACT_TO || !env.CONTACT_FROM) {
      return json({ ok: false, error: 'Contact form is not configured yet.' }, 500);
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return json({ ok: false, error: 'Expected JSON.' }, 415);
    }

    const body = await request.json();

    // Honeypot: real visitors should never fill this.
    if (body.company) {
      return json({ ok: true });
    }

    const name = clean(body.name, 120);
    const email = clean(body.email, 180);
    const message = clean(body.message, 3000);
    const page = clean(body.page, 500);
    const mode = clean(body.mode, 80);

    if (!message || message.length < 10) {
      return json({ ok: false, error: 'Please write a short message first.' }, 400);
    }

    if (email && !validEmail(email)) {
      return json({ ok: false, error: 'Please enter a valid email address, or leave it blank.' }, 400);
    }

    const subjectBits = ['EPK enquiry'];
    if (mode) subjectBits.push(mode);
    if (name) subjectBits.push(name);

    const text = [
      'New EPK enquiry',
      '',
      `Name: ${name || 'Not provided'}`,
      `Email: ${email || 'Not provided'}`,
      `Mode: ${mode || 'Not provided'}`,
      `Page: ${page || 'Not provided'}`,
      '',
      'Message:',
      message
    ].join('\n');

    const payload = {
      from: env.CONTACT_FROM,
      to: [env.CONTACT_TO],
      subject: subjectBits.join(' — '),
      text
    };

    if (email) payload.reply_to = email;

    const resend = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!resend.ok) {
      let detail = '';
      try {
        detail = JSON.stringify(await resend.json());
      } catch {
        detail = await resend.text();
      }

      console.error('Resend error:', resend.status, detail);
      return json({ ok: false, error: 'Email service failed. Please try WhatsApp or email directly.' }, 502);
    }

    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: 'Message could not be sent.' }, 500);
  }
}
