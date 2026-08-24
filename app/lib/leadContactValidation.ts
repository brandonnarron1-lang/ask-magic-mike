const LEAD_EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const LEAD_PHONE_PATTERN = /^\+?[()\d\s.-]{7,40}$/;

export function isValidLeadEmail(value: string) {
  const email = value.trim();
  return email.length <= 254 && LEAD_EMAIL_PATTERN.test(email);
}

export function isValidLeadPhone(value: string) {
  const phone = value.trim();
  const digits = phone.replace(/\D/g, "");
  return LEAD_PHONE_PATTERN.test(phone) && digits.length >= 10 && digits.length <= 15;
}
