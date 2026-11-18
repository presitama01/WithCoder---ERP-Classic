import React, { useState, useRef, useEffect } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { DatePickerInput } from './DatePickerInput';
import { A4PrintPreviewModal } from './A4PrintPreviewModal';
import {
  CompanyProfileData,
  FALLBACK_COMPANY_PROFILE,
  erpDelete,
  erpList,
  erpUpsert,
  nextUniqueCode,
  toDisplayDmy,
  toIsoDate,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';

interface CompanyProfileFormProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CompanyFormState {
  id?: string;
  profileCode: string;
  companyName: string;
  noNpwp: string;
  npwpAddress: string;
  tanggalNpwp: string;
  address: string;
  country: string;
  phone: string;
  fax: string;
  mail: string;
  ppnActive: boolean;
  ppnValue: string;
  wirajaya: boolean;
  backup: boolean;
}

function mapDbToForm(row: CompanyProfileData): CompanyFormState {
  return {
    id: row.id,
    profileCode: row.profile_code || '01',
    companyName: row.company_name || '',
    noNpwp: row.no_npwp || '',
    npwpAddress: row.npwp_address || '',
    tanggalNpwp: row.tanggal_npwp ? toDisplayDmy(row.tanggal_npwp) : '',
    address: row.address || '',
    country: row.country || 'INDONESIA',
    phone: row.phone || '',
    fax: row.fax || '',
    mail: row.mail || '',
    ppnActive: Boolean(row.ppn_active),
    ppnValue: String(row.ppn_value ?? 0),
    wirajaya: Boolean(row.wirajaya),
    backup: Boolean(row.backup),
  };
}

export const CompanyProfileForm: React.FC<CompanyProfileFormProps> = ({ isOpen, onClose }) => {
  const [profiles, setProfiles] = useState<CompanyProfileData[]>([]);
  const [formData, setFormData] = useState<CompanyFormState>(() =>
    mapDbToForm(FALLBACK_COMPANY_PROFILE)
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  const [isFindOpen, setIsFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const companyNameRef = useRef<HTMLInputElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const loadProfiles = async (targetCode?: string) => {
    try {
      setIsBusy(true);
      let rows = await erpList<CompanyProfileData>('company_profiles', {
        orderBy: 'profile_code',
        asc: true,
      });
      if (!rows || rows.length === 0) {
        try {
          const seeded = await erpUpsert<CompanyProfileData>(
            'company_profiles',
            FALLBACK_COMPANY_PROFILE,
            'profile_code'
          );
          if (seeded) {
            rows = [seeded];
          }
        } catch {
          rows = [FALLBACK_COMPANY_PROFILE as any];
        }
      }
      setProfiles(rows);
      const code = targetCode || formData.profileCode || '01';
      const found = rows.find((r) => r.profile_code === code) || rows[0];
      if (found) {
        setFormData(mapDbToForm(found));
      }
    } catch (err: any) {
      showFeedback(`Error: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadProfiles();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof CompanyFormState, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectProfileCode = (code: string) => {
    const found = profiles.find((p) => p.profile_code === code);
    if (found) {
      setFormData(mapDbToForm(found));
    } else {
      setFormData((prev) => ({ ...prev, id: undefined, profileCode: code }));
    }
  };

  const handleSave = async () => {
    if (!formData.companyName.trim()) {
      showFeedback('Company Name wajib diisi');
      companyNameRef.current?.focus();
      return;
    }
    try {
      setIsBusy(true);
      const payload: Partial<CompanyProfileData> = {
        profile_code: formData.profileCode.trim() || '01',
        company_name: formData.companyName.trim().toUpperCase(),
        no_npwp: formData.noNpwp.trim(),
        npwp_address: formData.npwpAddress.trim(),
        tanggal_npwp: toIsoDate(formData.tanggalNpwp),
        address: formData.address.trim(),
        country: formData.country.trim().toUpperCase(),
        phone: formData.phone.trim(),
        fax: formData.fax.trim(),
        mail: formData.mail.trim(),
        ppn_active: formData.ppnActive,
        ppn_value: Number(formData.ppnValue) || 0,
        wirajaya: formData.wirajaya,
        backup: formData.backup,
      };
      const saved = await erpUpsert<CompanyProfileData>(
        'company_profiles',
        payload,
        'profile_code'
      );
      setFormData(mapDbToForm(saved));
      await loadProfiles(saved.profile_code);
      showFeedback('Company Profile tersimpan ke Supabase');
    } catch (err: any) {
      showFeedback(`Gagal simpan: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleBaru = () => {
    const nextCode = nextUniqueCode(
      ['01', ...profiles.map((p) => p.profile_code)],
      '',
      2
    );
    setFormData({
      profileCode: nextCode === '01' ? '02' : nextCode,
      companyName: '',
      noNpwp: '',
      npwpAddress: '',
      tanggalNpwp: '',
      address: '',
      country: 'INDONESIA',
      phone: '',
      fax: '',
      mail: '',
      ppnActive: false,
      ppnValue: '0',
      wirajaya: false,
      backup: false,
    });
    showFeedback('Form profil baru siap diisi');
    companyNameRef.current?.focus();
  };

  const handleKoreksi = () => {
    companyNameRef.current?.focus();
    showFeedback('Mode koreksi aktif - edit lalu klik Simpan');
  };

  const handleRequestHapus = () => {
    if (!formData.id) {
      showFeedback('Profil belum tersimpan di database');
      return;
    }
    if (formData.profileCode === '01') {
      showFeedback('Profil utama (01) tidak dapat dihapus');
      return;
    }
    setConfirmDeleteId(formData.id);
  };

  const handleConfirmHapus = async () => {
    if (!confirmDeleteId) return;
    try {
      setIsBusy(true);
      await erpDelete('company_profiles', confirmDeleteId);
      setConfirmDeleteId(null);
      await loadProfiles('01');
      showFeedback('Profil dihapus dari Supabase');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const openFindModal = async () => {
    setIsFindOpen(true);
    await loadProfiles();
    setTimeout(() => findInputRef.current?.focus(), 60);
  };

  const handleExportExcel = () => {
    exportToExcel({
      fileName: 'Company_Profile',
      sheetTitle: 'COMPANY PROFILE',
      companyProfile: {
        company_name: formData.companyName,
        address: formData.address,
        phone: formData.phone,
      },
      columns: [
        { header: 'Code', accessor: 'profile_code' },
        { header: 'Company Name', accessor: 'company_name' },
        { header: 'No. NPWP', accessor: 'no_npwp' },
        { header: 'Alamat', accessor: 'address' },
        { header: 'Telepon', accessor: 'phone' },
        { header: 'Fax', accessor: 'fax' },
        { header: 'Email', accessor: 'mail' },
      ],
      rows:
        profiles.length > 0
          ? profiles
          : [
              {
                profile_code: formData.profileCode,
                company_name: formData.companyName,
                no_npwp: formData.noNpwp,
                address: formData.address,
                phone: formData.phone,
                fax: formData.fax,
                mail: formData.mail,
              },
            ],
    });
    showFeedback('Export Excel selesai');
  };

  const availableCodes = Array.from(
    new Set(['01', '02', ...profiles.map((p) => p.profile_code), formData.profileCode])
  ).sort();

  const filteredProfiles = profiles.filter((p) => {
    if (!findQuery.trim()) return true;
    const qParts = findQuery.toLowerCase().trim().split(/\s+/);
    const searchable = [
      p.profile_code || '',
      p.company_name || '',
      p.no_npwp || '',
      p.address || '',
      p.phone || '',
      p.mail || '',
    ]
      .join(' ')
      .toLowerCase();

    return qParts.every((part) => searchable.includes(part));
  });

  const printRows = [
    { field: 'Profile Code', value: formData.profileCode },
    { field: 'Company Name', value: formData.companyName },
    { field: 'No. NPWP', value: formData.noNpwp },
    { field: 'NPWP Address', value: formData.npwpAddress },
    { field: 'Tanggal NPWP', value: formData.tanggalNpwp },
    { field: 'Address', value: formData.address },
    { field: 'Country', value: formData.country },
    { field: 'Phone', value: formData.phone },
    { field: 'Fax', value: formData.fax },
    { field: 'Email', value: formData.mail },
    { field: 'PPN Aktif', value: formData.ppnActive ? `Ya (${formData.ppnValue}%)` : 'Tidak' },
  ];

  return (
    <div
      id="company-profile-form-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        <FormHeaderBanner
          title="Company Profile"
          onClose={onClose}
          onFind={openFindModal}
          onPrint={() => setIsPrintOpen(true)}
          onTableView={() => loadProfiles(formData.profileCode)}
          onExportExcel={handleExportExcel}
        />

        <div className="shrink-0 flex items-center h-[48px] px-3 bg-[#ECE9D8] border-b border-[#ACA899] text-[11px] font-sans">
          <FormActionButtons
            onSimpan={handleSave}
            onBaru={handleBaru}
            onKoreksi={handleKoreksi}
            onHapus={handleRequestHapus}
            onPrint={() => setIsPrintOpen(true)}
            onFind={openFindModal}
            isBusy={isBusy}
            feedback={feedback}
          />
        </div>

        <div className="flex-1 overflow-auto p-4 bg-[#ECE9D8]">
          <div className="max-w-3xl mx-auto bg-[#ECE9D8] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white p-6 shadow-md">
            <div className="text-sm font-bold text-[#003C74] border-b border-[#ACA899] pb-2 mb-4 flex items-center justify-between">
              <span>Program Setup &amp; Company Profile</span>
              <span className="text-[11px] font-normal text-[#555]">
                Total Profil Tersimpan: <b>{profiles.length}</b>
              </span>
            </div>

            <div className="space-y-3 text-xs text-black">
              <div className="flex items-center gap-2">
                <label className="w-36 text-right pr-3 font-medium">Profile Code :</label>
                <select
                  value={formData.profileCode}
                  onChange={(e) => handleSelectProfileCode(e.target.value)}
                  className="border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white px-2 py-1 w-24 text-xs outline-none focus:border-[#316AC5]"
                >
                  {availableCodes.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={openFindModal}
                  className="px-2.5 py-1 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] text-[11px] font-semibold cursor-pointer"
                >
                  Cari Profil...
                </button>
              </div>

              <div className="flex items-center">
                <label className="w-36 text-right pr-3 font-medium">Company Name :</label>
                <input
                  ref={companyNameRef}
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  className="border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white px-2 py-1 flex-1 text-xs outline-none focus:border-[#316AC5]"
                />
              </div>

              <div className="flex items-center">
                <label className="w-36 text-right pr-3 font-medium">No.NPWP :</label>
                <input
                  type="text"
                  value={formData.noNpwp}
                  onChange={(e) => handleChange('noNpwp', e.target.value)}
                  className="border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white px-2 py-1 w-72 text-xs outline-none focus:border-[#316AC5]"
                />
              </div>

              <div className="flex items-start">
                <label className="w-36 text-right pr-3 font-medium pt-1">NPWP Address :</label>
                <textarea
                  value={formData.npwpAddress}
                  onChange={(e) => handleChange('npwpAddress', e.target.value)}
                  rows={3}
                  className="border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white px-2 py-1 flex-1 text-xs outline-none resize-none focus:border-[#316AC5]"
                />
              </div>

              <div className="flex items-center">
                <label className="w-36 text-right pr-3 font-medium">Tanggal NPWP :</label>
                <DatePickerInput
                  value={formData.tanggalNpwp}
                  onChange={(formatted) => handleChange('tanggalNpwp', formatted)}
                  format="dmy"
                  inputClassName="border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white px-2 py-0.5 w-32 text-xs outline-none focus:border-[#316AC5]"
                />
              </div>

              <div className="flex items-start">
                <label className="w-36 text-right pr-3 font-medium pt-1">Address :</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  rows={3}
                  className="border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white px-2 py-1 flex-1 text-xs outline-none resize-none focus:border-[#316AC5]"
                />
              </div>

              <div className="flex items-center">
                <label className="w-36 text-right pr-3 font-medium">Country :</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                  className="border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white px-2 py-1 flex-1 text-xs outline-none focus:border-[#316AC5]"
                />
              </div>

              <div className="flex items-center">
                <label className="w-36 text-right pr-3 font-medium">Phone :</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white px-2 py-1 w-56 text-xs outline-none focus:border-[#316AC5]"
                />
              </div>

              <div className="flex items-center">
                <label className="w-36 text-right pr-3 font-medium">Fax :</label>
                <input
                  type="text"
                  value={formData.fax}
                  onChange={(e) => handleChange('fax', e.target.value)}
                  className="border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white px-2 py-1 w-56 text-xs outline-none focus:border-[#316AC5]"
                />
              </div>

              <div className="flex items-center">
                <label className="w-36 text-right pr-3 font-medium">Mail :</label>
                <input
                  type="text"
                  value={formData.mail}
                  onChange={(e) => handleChange('mail', e.target.value)}
                  className="border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white px-2 py-1 flex-1 text-xs outline-none focus:border-[#316AC5]"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-[#ACA899] mt-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.ppnActive}
                    onChange={(e) => handleChange('ppnActive', e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="font-medium">PPN :</span>
                  <input
                    type="text"
                    value={formData.ppnValue}
                    onChange={(e) => handleChange('ppnValue', e.target.value)}
                    className="border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white px-2 py-1 w-20 text-xs text-right outline-none focus:border-[#316AC5]"
                  />
                </div>

                <div className="flex flex-col gap-1.5 pr-8">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.wirajaya}
                      onChange={(e) => handleChange('wirajaya', e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="font-medium">Wirajaya</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.backup}
                      onChange={(e) => handleChange('backup', e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="font-medium">Back Up</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Find & Search Modal */}
      {isFindOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-[#ECE9D8] border-2 border-[#0055EA] shadow-2xl w-[660px] max-h-[82vh] flex flex-col text-xs">
            <div className="bg-[#000080] text-white px-3 py-1.5 flex items-center justify-between font-bold">
              <span>Cari &amp; Daftar Profil Perusahaan (Supabase)</span>
              <button
                type="button"
                onClick={() => setIsFindOpen(false)}
                className="px-1.5 bg-[#C00000] text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-3 space-y-2 flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="font-bold whitespace-nowrap">Search :</span>
                <input
                  ref={findInputRef}
                  type="text"
                  value={findQuery}
                  onChange={(e) => setFindQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      loadProfiles();
                      showFeedback(`Pencarian selesai: ${filteredProfiles.length} profil ditemukan`);
                    }
                  }}
                  placeholder="Cari Kode, Nama Perusahaan, NPWP, Alamat, Telepon, Email..."
                  className="flex-1 h-[24px] px-2 bg-white border border-[#7F9DB9] outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    loadProfiles();
                    showFeedback(`Pencarian selesai: ${filteredProfiles.length} profil ditemukan`);
                  }}
                  className="h-[24px] px-3 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] font-semibold cursor-pointer"
                >
                  Cari
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFindQuery('');
                    loadProfiles();
                    showFeedback('Data di-refresh dari Supabase');
                  }}
                  className="h-[24px] px-3 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] font-semibold cursor-pointer"
                >
                  Refresh
                </button>
              </div>
              <div className="flex-1 min-h-[220px] overflow-auto bg-white border border-[#7F9DB9]">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="sticky top-0 bg-[#ECE9D8] border-b border-[#ACA899]">
                    <tr>
                      <th className="px-2 py-1 border-r border-[#ACA899] w-14 text-center">Kode</th>
                      <th className="px-2 py-1 border-r border-[#ACA899]">Company Name</th>
                      <th className="px-2 py-1 border-r border-[#ACA899]">No. NPWP</th>
                      <th className="px-2 py-1 border-r border-[#ACA899]">Phone</th>
                      <th className="px-2 py-1">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProfiles.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-gray-500 italic">
                          Tidak ada profil perusahaan yang cocok
                        </td>
                      </tr>
                    ) : (
                      filteredProfiles.map((p) => (
                        <tr
                          key={p.id || p.profile_code}
                          onClick={() => {
                            setFormData(mapDbToForm(p));
                            setIsFindOpen(false);
                            showFeedback(`Profil [${p.profile_code}] dimuat`);
                          }}
                          className={`cursor-pointer border-b border-[#E0E0E0] hover:bg-[#316AC5] hover:text-white ${
                            p.profile_code === formData.profileCode ? 'bg-[#FFFF99]' : ''
                          }`}
                        >
                          <td className="px-2 py-1 font-mono font-bold text-center border-r border-[#E0E0E0]">
                            {p.profile_code}
                          </td>
                          <td className="px-2 py-1 font-semibold border-r border-[#E0E0E0]">
                            {p.company_name}
                          </td>
                          <td className="px-2 py-1 font-mono border-r border-[#E0E0E0]">
                            {p.no_npwp || '-'}
                          </td>
                          <td className="px-2 py-1 border-r border-[#E0E0E0]">{p.phone || '-'}</td>
                          <td className="px-2 py-1">{p.mail || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-[11px] text-[#555]">
                  Klik baris untuk memuat profil ke form.
                </span>
                <button
                  type="button"
                  onClick={() => setIsFindOpen(false)}
                  className="px-3 py-1 bg-[#ECE9D8] border border-[#7A7A7A] cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[#ECE9D8] border-2 border-[#0055EA] shadow-xl w-[360px] overflow-hidden">
            <div className="bg-[#0A246A] text-white px-3 py-1.5 font-bold text-xs">
              Konfirmasi Hapus Profil Perusahaan
            </div>
            <div className="p-4 text-xs text-black space-y-3">
              <p>
                Yakin ingin menghapus profil [{formData.profileCode} - {formData.companyName}] dari
                database Supabase?
              </p>
              <div className="flex justify-end space-x-2 pt-2 border-t border-[#C0C0C0]">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-3 py-1 bg-[#ECE9D8] border border-[#7A7A7A] text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleConfirmHapus}
                  className="px-3 py-1 bg-[#C00000] text-white border border-black text-xs font-bold cursor-pointer"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="DATA COMPANY PROFILE"
        subtitle={`Kode Profil: ${formData.profileCode}`}
        columns={[
          { header: 'Field Informasi', accessor: 'field', width: '180px' },
          { header: 'Keterangan / Isi', accessor: 'value' },
        ]}
        rows={printRows}
        showSignatures={false}
      />
    </div>
  );
};
