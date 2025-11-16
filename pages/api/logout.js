export default function handler(req, res) {
  if (req.method === 'POST') {
    res.setHeader(
      'Set-Cookie',
      'auth_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
    );
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
