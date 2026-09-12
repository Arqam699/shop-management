export const formatCnicSearchInput = (value) => {
  const rawValue = String(value ?? '');

  // Keep regular searches (names, invoice IDs, etc.) untouched.
  if (!/^[\d-]*$/.test(rawValue)) {
    return rawValue;
  }

  const digits = rawValue.replace(/\D/g, '').slice(0, 13);

  // Pakistani mobile numbers begin with 03. Keep them dash-free while searching.
  if (digits.startsWith('03') && digits.length <= 11) {
    return digits;
  }

  if (digits.length <= 5) return digits;
  if (digits.length <= 12) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }

  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
};

export const matchesCnicSearch = (cnic, searchTerm) => {
  const queryDigits = String(searchTerm ?? '').replace(/\D/g, '');
  const cnicDigits = String(cnic ?? '').replace(/\D/g, '');

  return Boolean(queryDigits) && cnicDigits.includes(queryDigits);
};

export const matchesMobileSearch = (mobileNumber, searchTerm) => {
  const normalizeMobile = (value) => {
    const digits = String(value ?? '').replace(/\D/g, '');
    if (digits.startsWith('0092')) return `0${digits.slice(4)}`;
    if (digits.startsWith('92')) return `0${digits.slice(2)}`;
    return digits;
  };

  const queryDigits = normalizeMobile(searchTerm);
  const mobileDigits = normalizeMobile(mobileNumber);

  return Boolean(queryDigits) && mobileDigits.includes(queryDigits);
};
