export function getRoleDestination(role) {
  if (role === 'DRIVER') return '/driver';
  if (role === 'ADMIN') return '/admin';
  return '/rides';
}
