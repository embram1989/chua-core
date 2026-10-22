/**
 * Calculates the exact age of a person in years based on birthDate string (YYYY-MM-DD or ISO string)
 */
export const calculateAge = (birthDate) => {
  if (!birthDate) return '-';
  const today = new Date();
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return '-';
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : '-';
};
