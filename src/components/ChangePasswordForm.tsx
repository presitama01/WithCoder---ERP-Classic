import React, { useState } from 'react';
import { getCurrentUser, changeUserPassword } from '../lib/authService';

interface ChangePasswordFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const currentUser = getCurrentUser();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!oldPassword) {
      setFeedback({ type: 'error', text: 'Masukkan password lama.' });
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setFeedback({ type: 'error', text: 'Password baru minimal 4 karakter.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', text: 'Konfirmasi password baru tidak cocok.' });
      return;
    }

    try {
      setIsSubmitting(true);
      await changeUserPassword(currentUser.username, oldPassword, newPassword);
      setFeedback({ type: 'success', text: 'Password berhasil diubah!' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onSuccess?.();
      setTimeout(() => {
        setFeedback(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Gagal mengubah password.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 font-sans select-none">
      <div className="w-[360px] bg-[#ECE9D8] rounded-t-md shadow-[3px_3px_12px_rgba(0,0,0,0.4)] border border-[#0055EA]">
        {/* Titlebar */}
        <div className="flex items-center justify-between h-[28px] px-2 rounded-t-[5px] bg-gradient-to-r from-[#9CBFEF] via-[#ABC8F3] to-[#88B0EB] border-b border-[#7095D3]">
          <span className="text-[12px] font-bold text-[#001D4A]">
            Ganti Password Pengguna
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-[18px] h-[18px] bg-[#D74338] hover:bg-[#E85347] border border-[#B72A20] text-white flex items-center justify-center text-[10px] font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-3 text-[11px] space-y-2.5">
          <div className="bg-[#FFFFE0] border border-[#D0C070] p-1.5 text-[10px] text-gray-700">
            Mengubah kata sandi untuk akun yang sedang login saat ini.
          </div>

          <div className="grid grid-cols-[130px_1fr] items-center gap-2">
            <label className="font-bold text-gray-700">User ID Aktif:</label>
            <input
              type="text"
              disabled
              value={`${currentUser.username} (${currentUser.role})`}
              className="h-[22px] px-1.5 bg-gray-200 border border-[#7F9DB9] font-bold text-blue-900 outline-none"
            />
          </div>

          <div className="grid grid-cols-[130px_1fr] items-center gap-2">
            <label className="font-bold text-gray-700">Password Lama:</label>
            <input
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Password saat ini"
              className="h-[22px] px-1.5 bg-white border border-[#7F9DB9] outline-none focus:bg-[#FFFFF0]"
            />
          </div>

          <div className="grid grid-cols-[130px_1fr] items-center gap-2">
            <label className="font-bold text-gray-700">Password Baru:</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 4 karakter"
              className="h-[22px] px-1.5 bg-white border border-[#7F9DB9] outline-none focus:bg-[#FFFFF0]"
            />
          </div>

          <div className="grid grid-cols-[130px_1fr] items-center gap-2">
            <label className="font-bold text-gray-700">Konfirmasi Password:</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi password baru"
              className="h-[22px] px-1.5 bg-white border border-[#7F9DB9] outline-none focus:bg-[#FFFFF0]"
            />
          </div>

          {feedback && (
            <div
              className={`p-1.5 text-[10px] font-bold border ${
                feedback.type === 'error'
                  ? 'bg-red-50 text-red-800 border-red-300'
                  : 'bg-green-50 text-green-800 border-green-300'
              }`}
            >
              {feedback.text}
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-2 border-t border-gray-300">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3 py-1 bg-[#ECE9D8] border-2 border-t-[#FFFFFF] border-l-[#FFFFFF] border-b-[#404040] border-r-[#404040] font-bold text-black hover:bg-gray-100 cursor-pointer"
            >
              Simpan Password
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 bg-[#ECE9D8] border-2 border-t-[#FFFFFF] border-l-[#FFFFFF] border-b-[#404040] border-r-[#404040] text-black hover:bg-gray-100 cursor-pointer"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
