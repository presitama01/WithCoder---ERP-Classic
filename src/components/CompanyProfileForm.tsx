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
  const companyNameRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const loadProfiles = async (targetCode?: string) => {
    try {
      setIsBusy(true);
      const rows = await erpList<CompanyProfileData>('company_profiles', {
        orderBy: 'profile_code',
        asc: true,
      });
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
    const nextCode = String(profiles.length + 1).padStart(2, '0');
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

  const handleHapus = async () => {
    if (!formData.id) {
      showFeedback('Profil belum tersimpan di database');
      return;
    }
    if (formData.profileCode === '01') {
      showFeedback('Profil utama (01) tidak dapat dihapus');
      return;
    }
    try {
      setIsBusy(true);
      await erpDelete('company_profiles', formData.id);
      await loadProfiles('01');
      showFeedback('Profil dihapus');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
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
      rows: profiles.length > 0 ? profiles : [
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
          onPrint={() => setIsPrintOpen(true)}
          onTableView={() => loadProfiles(formData.profileCode)}
          onExportExcel={handleExportExcel}
        />

        <div className="shrink-0 flex items-center h-[48px] px-3 bg-[#ECE9D8] border-b border-[#ACA899] text-[11px] font-sans">
          <FormActionButtons
            onSimpan={handleSave}
            onBaru={handleBaru}
            onKoreksi={handleKoreksi}
            onHapus={handleHapus}
            onPrint={() => setIsPrintOpen(true)}
            isBusy={isBusy}
            feedback={feedback}
          />
        </div>

        <div className="flex-1 overflow-auto p-4 bg-[#ECE9D8]">
          <div className="max-w-3xl mx-auto bg-[#ECE9D8] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white p-6 shadow-md">
            <div className="text-sm font-bold text-[#003C74] border-b border-[#ACA899] pb-2 mb-4">
              Program Setup &amp; Company Profile
            </div>

            <div className="space-y-3 text-xs text-black">
              <div className="flex items-center">
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
