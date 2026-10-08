"use client";
import React from "react";
import ReactSelect, { SingleValue } from "react-select";

export interface AppSelectOption {
  value: string;
  label: string;
}

export const AUTO_SEARCH_THRESHOLD = 5;

export function resolveIsSearchable(optionCount: number, override?: boolean): boolean {
  return override !== undefined ? override : optionCount > AUTO_SEARCH_THRESHOLD;
}

interface AppSelectProps {
  options: AppSelectOption[];
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  isDisabled?: boolean;
  isClearable?: boolean;
  size?: "sm";
  id?: string;
  className?: string;
  isSearchable?: boolean;
}

export default function AppSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  isDisabled,
  isClearable,
  size,
  id,
  className,
  isSearchable,
}: AppSelectProps) {
  const autoSearchable = resolveIsSearchable(options.length, isSearchable);
  const selected = options.find((o) => o.value === value) ?? null;

  const handleChange = (opt: SingleValue<AppSelectOption>) => {
    onChange(opt?.value ?? "");
  };

  return (
    <ReactSelect<AppSelectOption>
      inputId={id}
      options={options}
      value={selected}
      onChange={handleChange}
      placeholder={placeholder}
      isDisabled={isDisabled}
      isClearable={isClearable}
      isSearchable={autoSearchable}
      unstyled
      classNamePrefix="app-select"
      className={className}
      classNames={{
        control: ({ isFocused }) =>
          `form-select d-flex align-items-center p-0 pe-0 h-auto${isFocused ? " border-primary shadow-sm" : ""}${size === "sm" ? " form-select-sm" : ""}`,
        menu: () => "dropdown-menu show w-100 p-1 shadow",
        menuList: () => "py-0",
        option: ({ isFocused, isSelected }) =>
          `dropdown-item rounded-1${isSelected ? " active" : ""}${isFocused && !isSelected ? " bg-light" : ""}`,
        singleValue: () => "ms-1",
        input: () => "ms-1",
        placeholder: () => "ms-1 text-muted",
        noOptionsMessage: () => "dropdown-item disabled text-muted",
        indicatorsContainer: () => "d-none",
        valueContainer: () => "flex-grow-1 overflow-hidden",
      }}
    />
  );
}
