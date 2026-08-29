import { getRoleShortLabel } from '@/lib/roles';

export function getPersonDisplayName(person) {
  if (!person) return '';

  const roleLabel = getRoleShortLabel(person.role);
  const name = person.name?.trim();
  if (name && name !== roleLabel) return name;

  const username = person.username?.trim();
  if (username) return username;

  const email = person.email?.trim();
  if (email) return email;

  return name || '';
}

export function getPersonDisplayNameById(userId, users) {
  if (!userId || !users?.length) return '';
  const person = users.find((u) => u.id === userId);
  return getPersonDisplayName(person);
}
