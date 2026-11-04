export function getClientOrigin() {
  return (process.env.CLIENT_URL || 'http://localhost:5173').trim().replace(/\/+$/, '');
}
