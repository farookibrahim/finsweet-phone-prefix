type Country = {
  name: {
    common: string;
  };
  flags: {
    svg: string;
  };
  idd: {
    root: string;
    suffixes: string[];
  };
  cca2: string;
};

type DropdownItem = {
  element: HTMLElement;
  country: Country;
};

const isLetter = (key: string): boolean => {
  return /^[a-zA-Z]$/.test(key);
}

const isDigit = (key: string): boolean => {
  return /^[0-9]$/.test(key);
}

const dataPhonePrefixAttr = "data-phone-prefix-element";

export const dataPhonePrefixElements = {
  dropdown: `[${dataPhonePrefixAttr}="dropdown"]`,
  list: `[${dataPhonePrefixAttr}="list"]`,
  item: `[${dataPhonePrefixAttr}="item"]`,
  flag: `[${dataPhonePrefixAttr}="flag"]`,
  value: `[${dataPhonePrefixAttr}="value"]`,
  countryCodeInput: `[${dataPhonePrefixAttr}="countryCode"]`
};

const dropdownElements = {
  dropdown: "w-dropdown",
  dropdownToggle: "w-dropdown-toggle",
  dropdownList: "w-dropdown-list",
  dropdownListOpen: "w--open",
  dropdownItemSelected: "w--current"
};

export class PhonePrefix {
  private items: DropdownItem[] = [];
  private listIsOpen: boolean = false;
  private dropdownToggle: HTMLElement;
  private dropdownList: HTMLElement;
  private list: HTMLElement;
  private countryCodeInput?: HTMLInputElement;
  private selectedItem?: DropdownItem;
  private focusedItem?: DropdownItem;
  private searchQuery: string = '';

  constructor(element: HTMLElement, { defaultCountryCode, countryCodeInput }: { defaultCountryCode?: string, countryCodeInput?: HTMLInputElement } = {}) {
    this.dropdownToggle = element.querySelector(`.${dropdownElements.dropdownToggle}`) as HTMLElement;
    this.dropdownList = element.querySelector(`.${dropdownElements.dropdownList}`) as HTMLElement;
    this.list = element.querySelector(dataPhonePrefixElements.list) as HTMLElement;
    this.countryCodeInput = countryCodeInput;
    this.dropdownToggle.setAttribute("aria-haspopup", "listbox");
    this.init(defaultCountryCode);
  }

  private async init(defaultCountryCode?: string): Promise<void> {
    const countries = await this.fetchCountries();
    this.renderOptions(countries);
    this.addEventListeners();
    this.observeDropdownList();

    let countryCode = await this.fetchUserLocation();
    countryCode = countryCode || defaultCountryCode;

    const selectedCountry = this.items.find(item => item.country.cca2 === countryCode);
    if (selectedCountry) {
      this.handleItemSelect(selectedCountry);
    }
  }

  private async fetchCountries(): Promise<Country[]> {
    const url = "https://restcountries.com/v3.1/all?fields=name,cca2,idd,flags";
    try {
      const response = await fetch(url);
      return await response.json();
    } catch {
      return [];
    }
  }

  private async fetchUserLocation(): Promise<string | undefined> {
    const url = "https://www.cloudflare.com/cdn-cgi/trace";
    try {
      const response = await fetch(url);
      const text = await response.text();
      const locLine = text.match(/[^\r\n]+/g)?.find(line => line.startsWith("loc"));
      return locLine ? locLine.split("=")[1] : undefined;
    } catch {
      return undefined;
    }
  }

  private renderOptions(countries: Country[]) {
    const listItem = this.list.querySelector(dataPhonePrefixElements.item) as HTMLElement;
    if (!listItem) return;

    this.items = countries.map(country => {
      const itemElement = this.createCountryItem(country, listItem);
      this.list.appendChild(itemElement);
      return { element: itemElement, country: country };
    });

    this.list.removeChild(listItem);
  }

  private createCountryItem(country: Country, listItemTemplate: HTMLElement): HTMLElement {
    const itemElement = listItemTemplate.cloneNode(true) as HTMLElement;
    const flag = itemElement.querySelector(dataPhonePrefixElements.flag) as HTMLImageElement;
    const value = itemElement.querySelector(dataPhonePrefixElements.value) as HTMLElement;

    flag.src = country.flags.svg;
    flag.alt = `${country.name.common} Flag`;

    const countryCode = `${country.idd.root}${country.idd.suffixes.length === 1 ? country.idd.suffixes[0] : ""}`;
    value.textContent = `${country.cca2} (${countryCode})`;

    itemElement.setAttribute("aria-label", country.name.common);
    itemElement.setAttribute("title", country.name.common);

    return itemElement;
  }

  private addEventListeners(): void {
    this.dropdownList.addEventListener("keydown", (e) => {
      this.handleDropdownSearch(e);
      this.handleDropdownNavigation(e);
    });

    this.items.forEach(item => {
      item.element.addEventListener("click", () => this.handleItemSelect(item));
      item.element.addEventListener("focusin", () => {
        this.focusedItem = item;
      });
      item.element.addEventListener("focusout", () => {
        this.focusedItem = undefined;
      });
    });
  }

  private observeDropdownList(): void {
    new MutationObserver(() => {
      this.listIsOpen = this.dropdownList.classList.contains(dropdownElements.dropdownListOpen);
      if (this.listIsOpen) {
        this.clearSearchQuery();
        (this.selectedItem?.element ? this.selectedItem.element : this.items[0].element).focus();
      }
    }).observe(this.dropdownList, {
      attributes: true,
      attributeFilter: ["class"]
    });
  }

  private clearSearchQuery(): void {
    this.searchQuery = '';
  }

  private handleDropdownSearch(e: KeyboardEvent): void {
    if (!this.listIsOpen) return;

    const isBackspace = e.key === "Backspace";

    if (isBackspace) {
      this.searchQuery = this.searchQuery.slice(0, -1);
    } else if (e.key.length === 1 && (isLetter(e.key) || isDigit(e.key))) {
      if (isDigit(e.key) && isLetter(this.searchQuery)) {
        this.searchQuery = e.key;
      } else if (isLetter(e.key)) {
        if (isDigit(this.searchQuery)) {
          this.searchQuery = e.key;
        } else {
          this.searchQuery += e.key.toLowerCase();
        }
      } else if (isDigit(e.key)) {
        this.searchQuery += e.key;
      }
    }

    if (this.searchQuery?.length > 0 ) {
      const matchedItem = this.items.find(item => {
        const countryCode = `${item.country.idd.root}${item.country.idd.suffixes.length === 1 ? item.country.idd.suffixes[0] : ""}`;
        const searchTerm = this.searchQuery.toLowerCase();
        return (
          countryCode.toLowerCase().startsWith(`+${searchTerm}`) || 
          item.country.cca2.toLowerCase().startsWith(searchTerm) || 
          item.country.name.common.toLowerCase().startsWith(searchTerm)
        );
      });
      matchedItem?.element.focus();
    }
  }

  private handleDropdownNavigation(e: KeyboardEvent): void {
    if (!this.listIsOpen) return;

    const { key, shiftKey } = e;
    const isSpace = key === " ";
    const isTab = key === "Tab";
    const isArrowUp = key === "ArrowUp";
    const isArrowDown = key === "ArrowDown";

    if (isSpace && this.focusedItem) {
      this.focusedItem.element.click();
    }

    if (isTab) {
      if (shiftKey) {
        e.preventDefault();
      }
      this.closeDropdown(shiftKey);
    }

    if (isArrowUp || isArrowDown) {
      if (!this.focusedItem) return;

      const index = this.items.findIndex(item => {
        return item === this.focusedItem;
      });
      if (index < 0) return;

      let nextIndex = isArrowUp ? index - 1 : index + 1;
      if (nextIndex < 0) nextIndex = 0;
      if (nextIndex >= this.items.length) nextIndex = this.items.length;

      const nextItem = this.items[nextIndex];
      nextItem?.element.focus();
    }
  }

  private handleItemSelect(item: DropdownItem): void {
    if (this.selectedItem === item) return;

    if (this.selectedItem) {
      this.toggleItemSelected(this.selectedItem, false);
    }

    this.toggleItemSelected(item, true);
    this.selectedItem = item;

    this.updateDropdownToggle(item, this.dropdownToggle);
    if (this.countryCodeInput) {
      this.countryCodeInput.value = item.country.cca2;
    }

    if (this.listIsOpen) {
      this.closeDropdown();
    }
  }

  private toggleItemSelected(item: DropdownItem, isSelected: boolean): void {
    item.element.classList.toggle(dropdownElements.dropdownItemSelected, isSelected);
    item.element.setAttribute("aria-selected", `${isSelected}`);
  }

  private updateDropdownToggle(item: DropdownItem, dropdownToggle: HTMLElement): void {
    const { country } = item;
    const countryName = country.name.common;
    const countryCode = `${country.idd.root}${country.idd.suffixes.length === 1 ? country.idd.suffixes[0] : ""}`;

    const dropdownToggleFlag = dropdownToggle.querySelector(dataPhonePrefixElements.flag) as HTMLImageElement;
    const dropdownToggleValue = dropdownToggle.querySelector(dataPhonePrefixElements.value) as HTMLElement;

    dropdownToggleFlag.src = country.flags.svg;
    dropdownToggleFlag.alt = `${countryName} Flag`;

    dropdownToggleValue.textContent = countryCode;

    dropdownToggle.setAttribute("aria-label", countryName);
  }

  private closeDropdown(focusToggle: boolean = true): void {
    if (focusToggle) {
      this.dropdownToggle.focus();
    }
    this.dropdownToggle.dispatchEvent(new Event("click", { bubbles: true }));
    this.dropdownToggle.dispatchEvent(new Event("mouseup", { bubbles: true }));
  }
}
