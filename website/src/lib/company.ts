/**
 * Who operates Hive. Shown on the legal pages; fill every [bracketed] value before launch. While any value is
 * still a placeholder, the legal pages show a "draft" notice.
 */
export const COMPANY = {
  /** Legal name of the operator: your full name (sole proprietor) or the company, e.g. "Hive Labs GmbH". */
  name: "[Operator name or company]",
  /** Postal address; required in Switzerland for online services (UWG art. 3 para. 1 lit. s). */
  address: "[Street and number], [Postcode] [City], Switzerland",
  /** A real e-mail inbox (a contact form alone is not enough under Swiss case law). */
  email: "[contact e-mail]",
  /** Where data-protection requests go; can be the same inbox. */
  privacyEmail: "[privacy e-mail]",
  /** Commercial register / UID number, if registered; otherwise remove the line on the legal notice. */
  register: "[UID / commercial register number, if any]",
  /** VAT number once registered (required from CHF 100,000 annual turnover). */
  vat: "[VAT number, if registered]",
  /** GDPR art. 27 representative in the EU (needed when serving EU residents regularly). */
  euRepresentative: "[EU representative: name and address]",
  /** Where the hosting provider runs the app and database (Railway region). */
  hostingRegion: "[Railway region, e.g. EU West (Amsterdam)]",
};

/** Date of the current version of the terms and privacy policy (keep in sync with the app's TERMS_VERSION). */
export const LEGAL_UPDATED = "9 October 2026";

export const hasPlaceholders = Object.values(COMPANY).some((v) => v.startsWith("["));
