// Clipboard and Text Selection Helpers for Edit Menu

export function executeEditAction(action: 'Cut' | 'Copy' | 'Paste' | 'Select All'): string {
  const activeEl = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
  const isInputOrTextArea =
    activeEl &&
    (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') &&
    typeof activeEl.selectionStart === 'number';

  if (action === 'Select All') {
    if (isInputOrTextArea && activeEl) {
      activeEl.select();
      return 'Teks terseleksi.';
    }
    const sel = window.getSelection();
    if (sel) {
      const range = document.createRange();
      range.selectNodeContents(document.body);
      sel.removeAllRanges();
      sel.addRange(range);
      return 'Seluruh halaman terseleksi.';
    }
    return 'Select All selesai.';
  }

  if (action === 'Cut') {
    if (isInputOrTextArea && activeEl) {
      const start = activeEl.selectionStart ?? 0;
      const end = activeEl.selectionEnd ?? 0;
      const val = activeEl.value;
      const selectedText = val.substring(start, end);
      if (selectedText) {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(selectedText).catch(() => {});
        }
        activeEl.value = val.substring(0, start) + val.substring(end);
        activeEl.setSelectionRange(start, start);
        activeEl.dispatchEvent(new Event('input', { bubbles: true }));
        return `Cut: "${selectedText.slice(0, 20)}"`;
      }
    }
    document.execCommand('cut');
    return 'Cut dieksekusi.';
  }

  if (action === 'Copy') {
    if (isInputOrTextArea && activeEl) {
      const start = activeEl.selectionStart ?? 0;
      const end = activeEl.selectionEnd ?? 0;
      const selectedText = activeEl.value.substring(start, end);
      if (selectedText) {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(selectedText).catch(() => {});
        }
        return `Copy: "${selectedText.slice(0, 20)}"`;
      }
    }
    const windowSel = window.getSelection()?.toString();
    if (windowSel) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(windowSel).catch(() => {});
      }
      return `Copy: "${windowSel.slice(0, 20)}"`;
    }
    document.execCommand('copy');
    return 'Copy dieksekusi.';
  }

  if (action === 'Paste') {
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard
        .readText()
        .then((text) => {
          if (!text) return;
          if (isInputOrTextArea && activeEl) {
            const start = activeEl.selectionStart ?? 0;
            const end = activeEl.selectionEnd ?? 0;
            const val = activeEl.value;
            activeEl.value = val.substring(0, start) + text + val.substring(end);
            const newPos = start + text.length;
            activeEl.setSelectionRange(newPos, newPos);
            activeEl.dispatchEvent(new Event('input', { bubbles: true }));
          }
        })
        .catch(() => {
          document.execCommand('paste');
        });
      return 'Paste diproses.';
    }
    document.execCommand('paste');
    return 'Paste dieksekusi.';
  }

  return `${action} dieksekusi.`;
}
