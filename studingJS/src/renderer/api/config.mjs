// Default server — override via localStorage key 'jt.server.url'
const DEFAULT_API_BASE = 'https://perfect-curiosity-production-b689.up.railway.app';

export function getApiBase() {
  const custom = localStorage.getItem('jt.server.url');
  return (custom && custom.startsWith('http')) ? custom.replace(/\/$/, '') : DEFAULT_API_BASE;
}

// Computed once per session for performance
export const API_BASE = getApiBase();

export const STORAGE_KEYS = {
  refreshToken: 'jt.auth.refreshToken',
  userEmail:    'jt.auth.email',
  userPlan:     'jt.auth.plan',
};
