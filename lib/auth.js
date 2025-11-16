export function isAuthenticated(req) {
  const cookies = req.headers.cookie || '';
  return cookies.includes('auth_token=authenticated');
}

export function getAuthToken(req) {
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/auth_token=([^;]+)/);
  return match ? match[1] : null;
}