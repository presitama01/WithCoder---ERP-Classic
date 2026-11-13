import { erpList, erpCreate, erpUpdate, erpDelete } from './erpApi';

export type UserRole = 'Administrator' | 'Finance' | 'Operator';

export interface UserModulesPermission {
  master: boolean;
  pembelian: boolean;
  penjualan: boolean;
  stock: boolean;
  keuangan: boolean;
  admin: boolean;
}

export interface AppUserAccount {
  id?: string;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  password?: string;
  modules: UserModulesPermission;
}

const DEFAULT_MODULES: Record<UserRole, UserModulesPermission> = {
  Administrator: {
    master: true,
    pembelian: true,
    penjualan: true,
    stock: true,
    keuangan: true,
    admin: true,
  },
  Finance: {
    master: true,
    pembelian: true,
    penjualan: true,
    stock: true,
    keuangan: true,
    admin: false,
  },
  Operator: {
    master: true,
    pembelian: true,
    penjualan: true,
    stock: false,
    keuangan: false,
    admin: false,
  },
};

const DEFAULT_USERS: AppUserAccount[] = [
  {
    id: 'usr-admin',
    username: 'ADMIN',
    full_name: 'Administrator Utama',
    role: 'Administrator',
    is_active: true,
    password: '123456',
    modules: DEFAULT_MODULES.Administrator,
  },
  {
    id: 'usr-finance',
    username: 'FINANCE',
    full_name: 'Staff Finance & Accounting',
    role: 'Finance',
    is_active: true,
    password: '123456',
    modules: DEFAULT_MODULES.Finance,
  },
  {
    id: 'usr-retno',
    username: 'RETNO',
    full_name: 'Retno Operator Keuangan',
    role: 'Finance',
    is_active: true,
    password: '123456',
    modules: DEFAULT_MODULES.Finance,
  },
];

const LOCAL_STORAGE_USERS_KEY = 'withcoder_erp_users_data';
const LOCAL_STORAGE_CURRENT_KEY = 'withcoder_erp_current_user';

function loadStoredUsers(): AppUserAccount[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Ignore parse error
  }
  return DEFAULT_USERS;
}

function persistStoredUsers(users: AppUserAccount[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));
  } catch {
    // Non-blocking
  }
}

export function getCurrentUser(): AppUserAccount {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CURRENT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.username) return parsed;
    }
  } catch {
    // Ignore parse error
  }
  return DEFAULT_USERS[0]; // Default Administrator
}

export function setCurrentUser(user: AppUserAccount): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_CURRENT_KEY, JSON.stringify(user));
  } catch {
    // Non-blocking
  }
}

export async function getAllUsers(): Promise<AppUserAccount[]> {
  const localList = loadStoredUsers();
  try {
    // Attempt sync with Supabase app_users table
    const remote = await erpList<any>('app_users', { orderBy: 'username', asc: true });
    if (Array.isArray(remote) && remote.length > 0) {
      const merged: AppUserAccount[] = remote.map((r) => {
        const uname = String(r.username || '').toUpperCase();
        const localMatch = localList.find((u) => u.username.toUpperCase() === uname);
        const role = (r.role === 'SUPERADMIN' || r.role === 'ADMINISTRATOR' || r.role === 'Administrator')
          ? 'Administrator'
          : (r.role === 'FINANCE' || r.role === 'Finance')
          ? 'Finance'
          : (localMatch?.role || 'Finance');

        const modules = {
          master: r.can_master !== undefined ? !!r.can_master : (localMatch?.modules?.master ?? true),
          pembelian: r.can_pembelian !== undefined ? !!r.can_pembelian : (localMatch?.modules?.pembelian ?? true),
          penjualan: r.can_penjualan !== undefined ? !!r.can_penjualan : (localMatch?.modules?.penjualan ?? true),
          stock: r.can_stock !== undefined ? !!r.can_stock : (localMatch?.modules?.stock ?? true),
          keuangan: r.can_keuangan !== undefined ? !!r.can_keuangan : (localMatch?.modules?.keuangan ?? true),
          admin: r.can_admin !== undefined ? !!r.can_admin : (role === 'Administrator'),
        };

        return {
          id: r.id || localMatch?.id,
          username: uname,
          full_name: r.full_name || localMatch?.full_name || uname,
          role,
          is_active: r.is_active !== false,
          password: r.password || localMatch?.password || '123456',
          modules,
        };
      });

      // Include any local users not yet in remote
      for (const loc of localList) {
        if (!merged.some((m) => m.username.toUpperCase() === loc.username.toUpperCase())) {
          merged.push(loc);
        }
      }

      persistStoredUsers(merged);
      return merged;
    }
  } catch {
    // Fallback to local stored users on offline/error
  }
  return localList;
}

export async function saveUserAccount(user: AppUserAccount): Promise<AppUserAccount> {
  const all = await getAllUsers();
  const uname = user.username.trim().toUpperCase();
  const role = user.role;
  const modules = user.modules || DEFAULT_MODULES[role];

  const updatedUser: AppUserAccount = {
    ...user,
    username: uname,
    modules,
    password: user.password || '123456',
  };

  // 1. Sync to Supabase app_users
  const dbPayload: Record<string, any> = {
    username: uname,
    full_name: updatedUser.full_name,
    role: role.toUpperCase(),
    is_active: updatedUser.is_active,
    password: updatedUser.password || '123456',
    can_master: modules.master,
    can_pembelian: modules.pembelian,
    can_penjualan: modules.penjualan,
    can_stock: modules.stock,
    can_keuangan: modules.keuangan,
    can_admin: modules.admin,
  };

  if (user.id && !user.id.startsWith('usr-')) {
    await erpUpdate('app_users', user.id, dbPayload);
  } else {
    const existing = await erpList<any>('app_users', { eq: { username: uname } });
    if (existing.length > 0) {
      await erpUpdate('app_users', existing[0].id, dbPayload);
      updatedUser.id = existing[0].id;
    } else {
      const created = await erpCreate<any>('app_users', dbPayload);
      if (created?.id) updatedUser.id = created.id;
    }
  }

  // 2. Persist in local storage
  const idx = all.findIndex((u) => u.username.toUpperCase() === uname);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...updatedUser };
  } else {
    all.push(updatedUser);
  }
  persistStoredUsers(all);

  // If active user updated, refresh session
  const current = getCurrentUser();
  if (current.username.toUpperCase() === uname) {
    setCurrentUser(updatedUser);
  }

  return updatedUser;
}

export async function deleteUserAccount(id: string, username: string): Promise<void> {
  const uname = username.trim().toUpperCase();
  if (uname === 'ADMIN') {
    throw new Error('User ADMIN utama tidak dapat dihapus.');
  }

  if (id && !id.startsWith('usr-')) {
    await erpDelete('app_users', id);
  } else {
    const existing = await erpList<any>('app_users', { eq: { username: uname } });
    if (existing.length > 0 && existing[0]?.id) {
      await erpDelete('app_users', existing[0].id);
    }
  }

  const all = await getAllUsers();
  const filtered = all.filter((u) => u.username.toUpperCase() !== uname);
  persistStoredUsers(filtered);
}

export async function authenticateUser(username: string, passwordInput: string): Promise<AppUserAccount> {
  const uname = username.trim().toUpperCase();
  const all = await getAllUsers();
  const found = all.find((u) => u.username.toUpperCase() === uname);

  if (!found) {
    throw new Error(`User ID '${uname}' tidak ditemukan.`);
  }

  if (found.is_active === false) {
    throw new Error(`User ID '${uname}' berstatus Non-Aktif. Hubungi Administrator.`);
  }

  const expectedPass = found.password || '123456';
  if (expectedPass !== passwordInput) {
    throw new Error('Password salah. Silakan coba kembali.');
  }

  setCurrentUser(found);
  return found;
}

export async function changeUserPassword(
  username: string,
  oldPass: string,
  newPass: string
): Promise<void> {
  const uname = username.trim().toUpperCase();
  const all = await getAllUsers();
  const idx = all.findIndex((u) => u.username.toUpperCase() === uname);

  if (idx < 0) {
    throw new Error(`User '${uname}' tidak ditemukan.`);
  }

  const current = all[idx];
  const expectedPass = current.password || '123456';

  if (expectedPass !== oldPass) {
    throw new Error('Password lama tidak sesuai.');
  }

  if (!newPass || newPass.trim().length < 4) {
    throw new Error('Password baru minimal harus 4 karakter.');
  }

  // Sync directly to Supabase app_users table
  if (current.id && !current.id.startsWith('usr-')) {
    await erpUpdate('app_users', current.id, { password: newPass.trim() });
  } else {
    const existing = await erpList<any>('app_users', { eq: { username: uname } });
    if (existing.length > 0) {
      await erpUpdate('app_users', existing[0].id, { password: newPass.trim() });
    }
  }

  all[idx].password = newPass.trim();
  persistStoredUsers(all);

  const active = getCurrentUser();
  if (active.username.toUpperCase() === uname) {
    active.password = newPass.trim();
    setCurrentUser(active);
  }
}

export function canUserAccessModule(
  moduleName: 'master' | 'pembelian' | 'penjualan' | 'stock' | 'keuangan' | 'admin',
  user?: AppUserAccount
): boolean {
  const active = user || getCurrentUser();
  if (active.role === 'Administrator') return true;

  if (moduleName === 'admin') {
    return active.modules?.admin === true;
  }

  if (active.role === 'Finance') {
    // Finance can access master, pembelian, penjualan, stock, keuangan
    return true;
  }

  return active.modules?.[moduleName] ?? false;
}
