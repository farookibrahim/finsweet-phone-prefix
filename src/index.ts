import { dataPhonePrefixElements, PhonePrefix } from '$utils/phone-prefix';

window.Webflow ||= [];
window.Webflow.push(() => {
  const dropdown = document.querySelector(dataPhonePrefixElements.dropdown) as HTMLElement;
  if (!dropdown) return;

  const form = dropdown.closest("form");
  const countryCodeInput = form?.querySelector(dataPhonePrefixElements.countryCodeInput) as HTMLInputElement;
  const phonePrefix = new PhonePrefix(dropdown, {
    countryCodeInput,
    defaultCountryCode: "US"
  });
});
