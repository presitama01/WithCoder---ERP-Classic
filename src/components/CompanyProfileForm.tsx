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
import { SupabaseFindModal } from './SupabaseFindModal';
import { ToolbarSearchControl } from './ToolbarSearchControl';
import { matchesMultiKeyword } from '../lib/searchUtils';
import { ConfirmDialog } from './ConfirmDialog';
import { isMissingColumnError, isValidEmail } from '../lib/masterValidation';

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
  logoUrl: string;
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
    logoUrl: row.logo_url || '',
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
  const [searchField, setSearchField] = useState('Semua');
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const companyNameRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const SEARCH_COL_MAP: Record<string, string> = {
    Kode: 'profile_code',
    'Company Name': 'company_name',
    'No. NPWP': 'no_npwp',
    Alamat: 'address',
    Phone: 'phone',
    Email: 'mail',
  };

  const loadProfiles = async (
    targetCode?: string,
    opts?: { field?: string; term?: string; applyFirstMatch?: boolean }
  ): Promise<CompanyProfileData[] | null> => {
    try {
      setIsBusy(true);
      const activeField = opts?.field ?? searchField;
      const activeTerm = (opts?.term ?? '').trim();
      const queryOpts: Record<string, any> = {
        orderBy: 'profile_code',
        asc: true,
        limit: 500,
      };
      if (activeTerm) {
        const dbCol = SEARCH_COL_MAP[activeField];
        if (dbCol) {
          queryOpts.searchCol = dbCol;
          queryOpts.searchVal = activeTerm;
        } else {
          queryOpts.orSearch = 'profile_code,company_name,no_npwp,address,phone,mail';
          queryOpts.searchVal = activeTerm;
        }
      }
      let rows = await erpList<CompanyProfileData>('company_profiles', queryOpts);
      if (!activeTerm && (!rows || rows.length === 0)) {
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
      if (opts?.applyFirstMatch) {
        if (rows.length > 0) {
          setFormData(mapDbToForm(rows[0]));
        }
      } else {
        const code = targetCode || formData.profileCode || '01';
        const found = rows.find((r) => r.profile_code === code) || rows[0];
        if (found) {
          setFormData(mapDbToForm(found));
        }
      }
      return rows;
    } catch (err: any) {
      showFeedback(`Error: ${err.message}`);
      return null;
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
    if (!isValidEmail(formData.mail)) {
      showFeedback('Format email perusahaan tidak valid');
      return;
    }
    const ppnNum = Number(formData.ppnValue) || 0;
    if (ppnNum < 0 || ppnNum > 100) {
      showFeedback('Persentase PPN harus antara 0% sampai 100%');
      return;
    }
    try {
      setIsBusy(true);
      const basePayload: Partial<CompanyProfileData> = {
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
        ppn_value: ppnNum,
        wirajaya: formData.wirajaya,
        backup: formData.backup,
      };
      let saved: CompanyProfileData;
      let usedFallback = false;
      try {
        saved = await erpUpsert<CompanyProfileData>(
          'company_profiles',
          { ...basePayload, logo_url: formData.logoUrl.trim() },
          'profile_code'
        );
      } catch (err: any) {
        if (isMissingColumnError(err?.message || '')) {
          usedFallback = true;
          saved = await erpUpsert<CompanyProfileData>(
            'company_profiles',
            basePayload,
            'profile_code'
          );
        } else {
          throw err;
        }
      }
      setFormData(mapDbToForm(saved));
      await loadProfiles(saved.profile_code);
      showFeedback(
        usedFallback
          ? 'Profil tersimpan (jalankan SQL migrasi untuk menyimpan Logo URL)'
          : 'Company Profile tersimpan ke Supabase'
      );
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
      logoUrl: '',
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
    await loadProfiles(undefined, { field: 'Semua', term: '' });
  };

  const handleToolbarCari = async () => {
    const rows = await loadProfiles(undefined, {
      field: searchField,
      term: searchTerm,
      applyFirstMatch: true,
    });
    if (rows && rows.length > 0) {
      showFeedback(`Ditemukan ${rows.length} profil di Supabase [${rows[0].profile_code}]`);
    } else if (rows) {
      showFeedback('Profil perusahaan tidak ditemukan di Supabase');
    }
  };

  const handleToolbarReset = async () => {
    setSearchField('Semua');
    setSearchTerm('');
    const rows = await loadProfiles('01', { field: 'Semua', term: '' });
    if (rows) showFeedback(`Filter direset (${rows.length} profil)`);
  };

  const handleSearchTermChange = (val: string) => {
    setSearchTerm(val);
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

        <div className="shrink-0 flex items-center gap-2 h-[48px] px-3 bg-[#ECE9D8] border-b border-[#ACA899] text-[11px] font-sans overflow-x-auto">
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
          <ToolbarSearchControl
            searchField={searchField}
            onSearchFieldChange={setSearchField}
            searchTerm={searchTerm}
            onSearchTermChange={handleSearchTermChange}
            onCari={handleToolbarCari}
            onReset={handleToolbarReset}
            inputRef={searchInputRef}
            isBusy={isBusy}
            options={[
              { value: 'Semua', label: 'Semua' },
              { value: 'Kode', label: 'Kode' },
              { value: 'Company Name', label: 'Company Name' },
              { value: 'No. NPWP', label: 'No. NPWP' },
              { value: 'Alamat', label: 'Alamat' },
              { value: 'Phone', label: 'Phone' },
              { value: 'Email', label: 'Email' },
            ]}
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

              <div className="flex items-center gap-2">
                <label className="w-36 text-right pr-3 font-medium">Logo URL :</label>
                <input
                  type="text"
                  value={formData.logoUrl}
                  onChange={(e) => handleChange('logoUrl', e.target.value)}
                  placeholder="https://... atau /assets/logo.png (ditampilkan di kop surat Print)"
                  className="border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white px-2 py-1 flex-1 text-xs outline-none focus:border-[#316AC5]"
                />
                {formData.logoUrl.trim() && (
                  <img
                    src={formData.logoUrl.trim()}
                    alt="Preview Logo"
                    className="h-8 w-10 object-contain border border-[#ACA899] bg-white p-0.5 shrink-0"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
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

      <SupabaseFindModal
        isOpen={isFindOpen}
        onClose={() => setIsFindOpen(false)}
        tableLabel="Company Profile"
        rows={profiles}
        selectedId={formData.profileCode}
        getRowId={(r) => r.profile_code}
        getSearchValues={(r) => [
          r.profile_code,
          r.company_name,
          r.no_npwp,
          r.address,
          r.phone,
          r.mail,
        ]}
        initialQuery={searchTerm}
        isBusy={isBusy}
        onSearchSupabase={(q) => {
          setSearchField('Semua');
          setSearchTerm(q);
          return loadProfiles(undefined, { field: 'Semua', term: q });
        }}
        onRefreshSupabase={() => {
          setSearchField('Semua');
          setSearchTerm('');
          return loadProfiles(undefined, { field: 'Semua', term: '' });
        }}
        onSelectRow={(p, q) => {
          setFormData(mapDbToForm(p));
          setSearchTerm(q);
          showFeedback(`Profil [${p.profile_code}] dimuat`);
        }}
        columns={[
          { header: 'Kode', accessor: (r) => r.profile_code, widthClass: 'w-16', align: 'center', mono: true, bold: true },
          { header: 'Company Name', accessor: (r) => r.company_name, bold: true },
          { header: 'No. NPWP', accessor: (r) => r.no_npwp || '-', mono: true },
          { header: 'Phone', accessor: (r) => r.phone || '-' },
          { header: 'Email', accessor: (r) => r.mail || '-' },
        ]}
      />

      <ConfirmDialog
        isOpen={Boolean(confirmDeleteId)}
        title="Konfirmasi Hapus Profil Perusahaan"
        message={`Yakin ingin menghapus profil [${formData.profileCode} - ${formData.companyName}] dari database Supabase?`}
        detail="Data profil yang dihapus tidak dapat dikembalikan."
        isBusy={isBusy}
        onConfirm={handleConfirmHapus}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="DATA COMPANY PROFILE"
        subtitle={`Kode Profil: ${formData.profileCode}`}
        metaLines={[
          { label: 'Kode Profil', value: formData.profileCode },
          { label: 'Company Name', value: formData.companyName },
          { label: 'No. NPWP', value: formData.noNpwp || '-' },
          { label: 'Email', value: formData.mail || '-' },
        ]}
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
