import React, { useState, useEffect, useRef } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { A4PrintPreviewModal } from './A4PrintPreviewModal';
import { exportToExcel } from '../lib/exportExcel';
import {
  AppUserAccount,
  UserRole,
  getAllUsers,
  saveUserAccount,
  deleteUserAccount,
  getCurrentUser,
} from '../lib/authService';
import { fetchActiveCompanyProfile, CompanyProfileData } from '../lib/erpApi';

interface UserRightsFormProps {
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated?: () => void;
}

export const UserRightsForm: React.FC<UserRightsFormProps> = ({
  isOpen,
  onClose,
  onUserUpdated,
}) => {
  const [users, setUsers] = useState<AppUserAccount[]>([]);
  const [selectedUsername, setSelectedUsername] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isBusy, setIsBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Modal editor state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | undefined>(undefined);
  const [editUsername, setEditUsername] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('Finance');
  const [editPassword, setEditPassword] = useState('123456');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editModules, setEditModules] = useState({
    master: true,
    pembelian: true,
    penjualan: true,
    stock: true,
    keuangan: true,
    admin: false,
  });

  // Delete confirm modal
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<AppUserAccount | null>(null);

  // Print modal
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfileData | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const loadUsersList = async () => {
    try {
      setIsBusy(true);
      const list = await getAllUsers();
      setUsers(list);
      if (list.length > 0 && !selectedUsername) {
        setSelectedUsername(list[0].username);
      }
    } catch (err: any) {
      showFeedback(`Gagal memuat pengguna: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsersList();
      fetchActiveCompanyProfile().then(setCompanyProfile).catch(() => {});
    }
  }, [isOpen]);

  const filteredUsers = users.filter((u) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.full_name.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const selectedUser = users.find((u) => u.username === selectedUsername);

  const handleOpenAdd = () => {
    setModalError(null);
    setIsEditing(false);
    setEditId(undefined);
    setEditUsername('');
    setEditFullName('');
    setEditRole('Finance');
    setEditPassword('123456');
    setEditIsActive(true);
    setEditModules({
      master: true,
      pembelian: true,
      penjualan: true,
      stock: true,
      keuangan: true,
      admin: false,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = () => {
    if (!selectedUser) {
      showFeedback('Pilih user terlebih dahulu.');
      return;
    }
    setModalError(null);
    setIsEditing(true);
    setEditId(selectedUser.id);
    setEditUsername(selectedUser.username);
    setEditFullName(selectedUser.full_name);
    setEditRole(selectedUser.role);
    setEditPassword(selectedUser.password || '123456');
    setEditIsActive(selectedUser.is_active);
    setEditModules({
      master: selectedUser.modules?.master ?? true,
      pembelian: selectedUser.modules?.pembelian ?? true,
      penjualan: selectedUser.modules?.penjualan ?? true,
      stock: selectedUser.modules?.stock ?? true,
      keuangan: selectedUser.modules?.keuangan ?? true,
      admin: selectedUser.modules?.admin ?? (selectedUser.role === 'Administrator'),
    });
    setIsModalOpen(true);
  };

  const handleRoleChange = (role: UserRole) => {
    setEditRole(role);
    if (role === 'Administrator') {
      setEditModules({
        master: true,
        pembelian: true,
        penjualan: true,
        stock: true,
        keuangan: true,
        admin: true,
      });
    } else if (role === 'Finance') {
      setEditModules({
        master: true,
        pembelian: true,
        penjualan: true,
        stock: true,
        keuangan: true,
        admin: false,
      });
    } else {
      setEditModules({
        master: true,
        pembelian: true,
        penjualan: true,
        stock: false,
        keuangan: false,
        admin: false,
      });
    }
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    const uname = editUsername.trim().toUpperCase();
    if (!uname) {
      setModalError('User ID / Username wajib diisi.');
      return;
    }
    if (!editFullName.trim()) {
      setModalError('Nama Lengkap wajib diisi.');
      return;
    }
    if (!editPassword.trim() || editPassword.trim().length < 4) {
      setModalError('Password minimal 4 karakter.');
      return;
    }

    try {
      setIsBusy(true);
      await saveUserAccount({
        id: editId,
        username: uname,
        full_name: editFullName.trim() || uname,
        role: editRole,
        is_active: editIsActive,
        password: editPassword.trim(),
        modules: editModules,
      });

      setIsModalOpen(false);
      setModalError(null);
      showFeedback(`User ${uname} berhasil disimpan ke Supabase.`);
      await loadUsersList();
      setSelectedUsername(uname);
      onUserUpdated?.();
    } catch (err: any) {
      setModalError(err?.message || 'Gagal menyimpan user ke Supabase.');
      showFeedback(`Gagal menyimpan user: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteClick = () => {
    if (!selectedUser) {
      showFeedback('Pilih user yang akan dihapus.');
      return;
    }
    if (selectedUser.username.toUpperCase() === 'ADMIN') {
      showFeedback('User ADMIN utama tidak dapat dihapus.');
      return;
    }
    setDeleteConfirmUser(selectedUser);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmUser) return;
    try {
      setIsBusy(true);
      await deleteUserAccount(deleteConfirmUser.id || '', deleteConfirmUser.username);
      setDeleteConfirmUser(null);
      showFeedback(`User ${deleteConfirmUser.username} telah dihapus.`);
      await loadUsersList();
      onUserUpdated?.();
    } catch (err: any) {
      showFeedback(`Gagal menghapus user: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleExportExcel = () => {
    exportToExcel({
      sheetTitle: 'LAPORAN OTORISASI PENGGUNA & HAK AKSES',
      fileName: 'otorisasi_pengguna.xls',
      companyProfile: companyProfile || undefined,
      columns: [
        { header: 'No', accessor: (_r, i) => i + 1 },
        { header: 'User ID', accessor: 'username' },
        { header: 'Nama Lengkap', accessor: 'full_name' },
        { header: 'Role / Otoritas', accessor: 'role' },
        { header: 'Status', accessor: (r) => (r.is_active ? 'Aktif' : 'Non-Aktif') },
        { header: 'Master', accessor: (r) => (r.modules?.master ? 'YA' : 'TIDAK') },
        { header: 'Pembelian', accessor: (r) => (r.modules?.pembelian ? 'YA' : 'TIDAK') },
        { header: 'Penjualan', accessor: (r) => (r.modules?.penjualan ? 'YA' : 'TIDAK') },
        { header: 'Stock', accessor: (r) => (r.modules?.stock ? 'YA' : 'TIDAK') },
        { header: 'Keuangan', accessor: (r) => (r.modules?.keuangan ? 'YA' : 'TIDAK') },
        { header: 'Admin', accessor: (r) => (r.modules?.admin ? 'YA' : 'TIDAK') },
      ],
      rows: filteredUsers,
    });
    showFeedback('Laporan otorisasi pengguna diekspor ke Excel.');
  };

  const handleFind = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  };

  const handleToolbarSimpan = async () => {
    await loadUsersList();
    showFeedback('Data user tersinkronisasi dengan Supabase.');
  };

  return (
    <div
      id="user-rights-form-container"
      className="absolute inset-0 bg-[#D4D0C8] flex flex-col font-sans select-none z-30"
    >
      {/* 1. Header Banner */}
      <FormHeaderBanner
        title="OTORISASI PENGGUNA & HAK AKSES (USER RIGHTS)"
        onClose={onClose}
        onFind={handleFind}
        onPrint={() => setIsPrintOpen(true)}
        onTableView={loadUsersList}
        onExportExcel={handleExportExcel}
      />

      {/* 2. Form Toolbar Action Buttons */}
      <div className="bg-[#ECE9D8] border-b border-[#ACA899] px-3 py-1.5 flex items-center justify-between text-[11px] overflow-x-auto">
        <FormActionButtons
          onSimpan={handleToolbarSimpan}
          onBaru={handleOpenAdd}
          onKoreksi={handleOpenEdit}
          onHapus={handleDeleteClick}
          onPrint={() => setIsPrintOpen(true)}
          onFind={handleFind}
          isBusy={isBusy}
          feedback={feedback}
        />
        <div className="flex items-center space-x-2 text-[11px] text-gray-700 ml-2 shrink-0">
          <span className="font-bold">Role Aktif:</span>
          <span className="px-1.5 py-0.5 bg-white border border-[#7F9DB9] text-blue-900 font-semibold">
            {getCurrentUser().role}
          </span>
        </div>
      </div>

      {/* 3. Main Data Grid */}
      <div className="flex-1 p-2 flex flex-col overflow-hidden">
        <div className="flex-1 bg-white border-2 border-t-[#404040] border-l-[#404040] border-b-[#FFFFFF] border-r-[#FFFFFF] overflow-auto">
          <table className="w-full border-collapse text-[11px] text-left">
            <thead className="sticky top-0 bg-[#ECE9D8] border-b border-[#808080] text-black font-semibold shadow-sm z-10">
              <tr>
                <th className="border-r border-[#808080] px-2 py-1.5 text-center w-[35px]">No</th>
                <th className="border-r border-[#808080] px-2 py-1.5 w-[120px]">User ID</th>
                <th className="border-r border-[#808080] px-2 py-1.5 min-w-[180px]">Nama Lengkap</th>
                <th className="border-r border-[#808080] px-2 py-1.5 w-[130px]">Role / Otoritas</th>
                <th className="border-r border-[#808080] px-2 py-1.5 text-center w-[90px]">Status</th>
                <th className="border-r border-[#808080] px-1 py-1.5 text-center w-[65px]">Master</th>
                <th className="border-r border-[#808080] px-1 py-1.5 text-center w-[70px]">Pembelian</th>
                <th className="border-r border-[#808080] px-1 py-1.5 text-center w-[70px]">Penjualan</th>
                <th className="border-r border-[#808080] px-1 py-1.5 text-center w-[65px]">Stock</th>
                <th className="border-r border-[#808080] px-1 py-1.5 text-center w-[70px]">Keuangan</th>
                <th className="px-1 py-1.5 text-center w-[65px]">Admin</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-gray-500 italic">
                    {isBusy ? 'Memuat data pengguna...' : 'Tidak ada data pengguna ditemukan.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, index) => {
                  const isSelected = u.username === selectedUsername;
                  return (
                    <tr
                      key={u.username}
                      onClick={() => setSelectedUsername(u.username)}
                      onDoubleClick={handleOpenEdit}
                      className={`cursor-pointer border-b border-[#F0F0F0] ${
                        isSelected
                          ? 'bg-[#0A246A] text-white font-medium'
                          : index % 2 === 1
                          ? 'bg-[#F9F9F9] hover:bg-[#E8F0FE] text-black'
                          : 'bg-white hover:bg-[#E8F0FE] text-black'
                      }`}
                    >
                      <td className="border-r border-[#D0D0D0] px-2 py-1 text-center">{index + 1}</td>
                      <td className="border-r border-[#D0D0D0] px-2 py-1 font-bold">{u.username}</td>
                      <td className="border-r border-[#D0D0D0] px-2 py-1">{u.full_name}</td>
                      <td className="border-r border-[#D0D0D0] px-2 py-1">
                        <span
                          className={`px-1.5 py-0.5 rounded-sm text-[10px] font-bold ${
                            u.role === 'Administrator'
                              ? isSelected
                                ? 'bg-red-800 text-white'
                                : 'bg-red-100 text-red-800 border border-red-300'
                              : isSelected
                              ? 'bg-blue-800 text-white'
                              : 'bg-blue-100 text-blue-800 border border-blue-300'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="border-r border-[#D0D0D0] px-2 py-1 text-center font-semibold">
                        {u.is_active ? (
                          <span className={isSelected ? 'text-green-300' : 'text-green-700'}>● Aktif</span>
                        ) : (
                          <span className={isSelected ? 'text-red-300' : 'text-red-600'}>○ Non-Aktif</span>
                        )}
                      </td>
                      <td className="border-r border-[#D0D0D0] px-1 py-1 text-center">
                        {u.modules?.master ? '✓' : '-'}
                      </td>
                      <td className="border-r border-[#D0D0D0] px-1 py-1 text-center">
                        {u.modules?.pembelian ? '✓' : '-'}
                      </td>
                      <td className="border-r border-[#D0D0D0] px-1 py-1 text-center">
                        {u.modules?.penjualan ? '✓' : '-'}
                      </td>
                      <td className="border-r border-[#D0D0D0] px-1 py-1 text-center">
                        {u.modules?.stock ? '✓' : '-'}
                      </td>
                      <td className="border-r border-[#D0D0D0] px-1 py-1 text-center">
                        {u.modules?.keuangan ? '✓' : '-'}
                      </td>
                      <td className="px-1 py-1 text-center font-bold">
                        {u.modules?.admin ? '✓' : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Bottom Search / FIND Bar */}
        <div className="mt-2 bg-[#ECE9D8] border border-[#808080] p-1.5 flex items-center justify-between text-[11px]">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-[#000080]">Search:</span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari User ID / Nama..."
              className="w-[240px] h-[21px] px-1.5 bg-white border border-[#7F9DB9] outline-none font-sans"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="px-2 py-0.5 bg-[#E0DFD8] border border-gray-400 hover:bg-gray-200"
              >
                Reset
              </button>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-gray-600">Total User: {filteredUsers.length}</span>
            {feedback && (
              <span className="px-2 py-0.5 bg-[#FFFFE0] border border-[#E0D890] text-blue-900 font-bold">
                {feedback}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Editor Modal for Add / Edit User */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2">
          <div className="w-[460px] bg-[#ECE9D8] border-2 border-t-[#FFFFFF] border-l-[#FFFFFF] border-b-[#404040] border-r-[#404040] shadow-2xl font-sans">
            <div className="h-[26px] bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white px-2 flex items-center justify-between font-bold text-[11px]">
              <span>{isEditing ? `Koreksi Otorisasi User: ${editUsername}` : 'Tambah User Otoritas Baru'}</span>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white hover:bg-red-600 px-1 font-bold text-[10px]"
              >
                ✕
              </button>
            </div>

            <form noValidate onSubmit={handleSaveModal} className="p-3 text-[11px] space-y-2.5">
              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <label className="font-bold">User ID / Username:</label>
                <input
                  type="text"
                  required
                  disabled={isEditing}
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value.toUpperCase())}
                  placeholder="Cth: KASIR01"
                  className="h-[22px] px-1.5 bg-white border border-[#7F9DB9] outline-none disabled:bg-gray-200 font-bold"
                />
              </div>

              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <label className="font-bold">Nama Lengkap:</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="Nama Operator / Karyawan"
                  className="h-[22px] px-1.5 bg-white border border-[#7F9DB9] outline-none"
                />
              </div>

              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <label className="font-bold">Role / Otoritas:</label>
                <select
                  value={editRole}
                  onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                  className="h-[22px] px-1 bg-white border border-[#7F9DB9] outline-none font-bold text-blue-900"
                >
                  <option value="Administrator">Administrator (Full Access)</option>
                  <option value="Finance">Finance (Master, Pembelian, Penjualan, Stock, Keuangan)</option>
                  <option value="Operator">Operator Standar</option>
                </select>
              </div>

              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <label className="font-bold">Password User:</label>
                <input
                  type="text"
                  required
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Minimal 4 karakter"
                  className="h-[22px] px-1.5 bg-white border border-[#7F9DB9] outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <label className="font-bold">Status User:</label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                  />
                  <span className={editIsActive ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}>
                    {editIsActive ? 'User Aktif (Dapat Login)' : 'Non-Aktif (Login Diblokir)'}
                  </span>
                </label>
              </div>

              {/* Module Permissions Checkboxes */}
              <fieldset className="border border-[#7F9DB9] p-2 mt-2">
                <legend className="px-1 font-bold text-[#000080]">Hak Akses Modul Aplikasi:</legend>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editModules.master}
                      onChange={(e) => setEditModules({ ...editModules, master: e.target.checked })}
                    />
                    <span>Master Data</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editModules.pembelian}
                      onChange={(e) => setEditModules({ ...editModules, pembelian: e.target.checked })}
                    />
                    <span>Pembelian</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editModules.penjualan}
                      onChange={(e) => setEditModules({ ...editModules, penjualan: e.target.checked })}
                    />
                    <span>Penjualan</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editModules.stock}
                      onChange={(e) => setEditModules({ ...editModules, stock: e.target.checked })}
                    />
                    <span>Stock</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editModules.keuangan}
                      onChange={(e) => setEditModules({ ...editModules, keuangan: e.target.checked })}
                    />
                    <span>Keuangan</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={editRole !== 'Administrator'}
                      checked={editModules.admin}
                      onChange={(e) => setEditModules({ ...editModules, admin: e.target.checked })}
                    />
                    <span className="font-bold text-red-800">Menu Admin</span>
                  </label>
                </div>
              </fieldset>

              {modalError && (
                <div className="px-2 py-1.5 bg-red-50 border border-red-400 text-red-800 text-[11px] font-semibold">
                  {modalError}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-300">
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-4 py-1 bg-[#ECE9D8] border-2 border-t-[#FFFFFF] border-l-[#FFFFFF] border-b-[#404040] border-r-[#404040] font-bold text-black hover:bg-gray-100 active:border-t-[#404040] active:border-l-[#404040] cursor-pointer"
                >
                  {isBusy ? 'Menyimpan...' : 'Simpan'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setModalError(null);
                  }}
                  className="px-4 py-1 bg-[#ECE9D8] border-2 border-t-[#FFFFFF] border-l-[#FFFFFF] border-b-[#404040] border-r-[#404040] text-black hover:bg-gray-100 cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2">
          <div className="w-[360px] bg-[#ECE9D8] border-2 border-t-[#FFFFFF] border-l-[#FFFFFF] border-b-[#404040] border-r-[#404040] shadow-2xl p-4 font-sans text-[11px]">
            <div className="font-bold text-[12px] text-red-800 mb-2">Konfirmasi Hapus Pengguna</div>
            <p className="mb-4">
              Apakah Anda yakin ingin menghapus user{' '}
              <span className="font-bold text-blue-900">[{deleteConfirmUser.username}] - {deleteConfirmUser.full_name}</span>?
            </p>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={confirmDelete}
                className="px-3 py-1 bg-red-600 text-white font-bold hover:bg-red-700"
              >
                Ya, Hapus
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="px-3 py-1 bg-[#ECE9D8] border border-gray-400 text-black hover:bg-gray-100"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* A4 Print Preview Modal */}
      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="LAPORAN OTORISASI PENGGUNA & HAK AKSES"
        subtitle="Daftar akun pengguna, otoritas modul, dan status aktif WithCoder - ERP"
        columns={[
          { header: 'No', accessor: (_r, i) => i + 1, width: '35px', align: 'center' },
          { header: 'User ID', accessor: 'username', width: '90px' },
          { header: 'Nama Lengkap', accessor: 'full_name' },
          { header: 'Role / Otoritas', accessor: 'role', width: '100px' },
          { header: 'Status', accessor: (r) => (r.is_active ? 'Aktif' : 'Non-Aktif'), width: '70px', align: 'center' },
          { header: 'Master', accessor: (r) => (r.modules?.master ? 'YA' : '-'), width: '50px', align: 'center' },
          { header: 'Pembelian', accessor: (r) => (r.modules?.pembelian ? 'YA' : '-'), width: '60px', align: 'center' },
          { header: 'Penjualan', accessor: (r) => (r.modules?.penjualan ? 'YA' : '-'), width: '60px', align: 'center' },
          { header: 'Stock', accessor: (r) => (r.modules?.stock ? 'YA' : '-'), width: '50px', align: 'center' },
          { header: 'Keuangan', accessor: (r) => (r.modules?.keuangan ? 'YA' : '-'), width: '60px', align: 'center' },
          { header: 'Admin', accessor: (r) => (r.modules?.admin ? 'YA' : '-'), width: '50px', align: 'center' },
        ]}
        rows={filteredUsers}
      />
    </div>
  );
};
