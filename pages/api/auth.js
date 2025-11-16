const PASSWORD = process.env.SITE_PASSWORD || 'stagdo2025';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { password } = req.body;

    if (password === PASSWORD) {
      const expiryDate = new Date(Date.now() + SESSION_DURATION);
      res.setHeader(
        'Set-Cookie',
        `auth_token=authenticated; Path=/; HttpOnly; Secure; SameSite=Strict; Expires=${expiryDate.toUTCString()}`
      );
      return res.status(200).json({ success: true });
    }

    return res.status(401).json({ error: 'Invalid password' });
  }

  res.status(405).json({ error: 'Method not allowed' });
}