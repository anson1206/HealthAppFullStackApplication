const API_BASE = '/api/auth';

export async function register({ email, name }) {
  const res = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Registration failed');
  }
  return res.json();
}

export async function login({ email, name }) {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Login failed');
  }
  return res.json();
}

export async function getProfile(userId) {
  const url = `${API_BASE}/profile?userId=${encodeURIComponent(userId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Fetch profile failed');
  }
  return res.json();
}

export async function saveProfile(profile) {
  const res = await fetch(`${API_BASE}/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Save profile failed');
  }
  return res.json();
}

// lightweight local storage helpers (no JWT yet)
export function saveUser(user) {
  localStorage.setItem('appUser', JSON.stringify(user));
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('appUser'));
  } catch (e) {
    return null;
  }
}

export function clearUser() {
  localStorage.removeItem('appUser');
}
