import { getDb } from '../../lib/db';
import { getSessionUser } from '../../lib/auth';
import { defaultContent } from '../../lib/siteContent';

const SIMTHEORY_CHAT_URL =
  process.env.SIMTHEORY_CHAT_URL || 'https://cartwright.simtheory.ai/api/v1/chat/completions';

async function getSiteContent(db) {
  const rows = await db.all('SELECT key, value FROM site_content');
  const stored = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return { ...defaultContent, ...stored };
}

function extractSimtheoryResponse(payload) {
  if (!payload || typeof payload !== 'object') {
    return { reply: '', conversationId: null };
  }

  const conversationId =
    payload.conversation_id ?? payload.conversationId ?? null;

  let reply = '';
  const choice = payload.choices?.[0];
  if (choice?.message?.content != null) {
    reply = String(choice.message.content);
  } else if (choice?.text != null) {
    reply = String(choice.text);
  } else if (payload.message?.content != null) {
    reply = String(payload.message.content);
  } else if (payload.content != null) {
    reply = String(payload.content);
  } else if (payload.reply != null) {
    reply = String(payload.reply);
  } else if (payload.text != null) {
    reply = String(payload.text);
  }

  return { reply: reply.trim(), conversationId };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const db = await getDb();
  const user = await getSessionUser(req, db);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const content = await getSiteContent(db);
  if ((content.chatEnabled || 'false').toLowerCase() !== 'true') {
    return res.status(403).json({ error: 'Chat is currently disabled' });
  }

  const apiKey = process.env.SIMTHEORY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'SIMTHEORY_API_KEY is not configured on server' });
  }

  const { message, conversationId: clientConversationId } = req.body || {};
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const systemPrompt = (content.chatSystemPrompt || defaultContent.chatSystemPrompt || '').trim();
  const model = (content.chatModel || '').trim();

  const userContent = message.trim();

  /** @type {Record<string, unknown>} */
  const body = {};

  if (systemPrompt) {
    // Anthropic-backed providers expect system instructions as top-level field.
    body.system = systemPrompt;
  }

  if (clientConversationId && String(clientConversationId).trim()) {
    body.conversation_id = String(clientConversationId).trim();
    body.messages = [{ role: 'user', content: userContent }];
  } else {
    body.messages = [{ role: 'user', content: userContent }];
  }

  const isBedrockArn = model.startsWith('arn:');
  if (model && !isBedrockArn) {
    body.model = model;
  }

  try {
    const upstream = await fetch(SIMTHEORY_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const payload = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      const msg =
        payload?.error?.message ||
        payload?.message ||
        payload?.detail ||
        `Simtheory request failed (${upstream.status})`;
      return res.status(502).json({ error: msg });
    }

    const { reply, conversationId } = extractSimtheoryResponse(payload);

    if (!reply) {
      return res.status(502).json({ error: 'Empty response from Simtheory' });
    }

    return res.status(200).json({
      reply,
      conversationId: conversationId || clientConversationId || null
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
