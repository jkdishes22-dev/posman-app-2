"use client";

import React, { useEffect, useMemo, useRef } from "react";
import DatePicker, { CalendarContainer } from "react-datepicker";
import type { ComponentProps } from "react";
import { endOfDay, startOfDay } from "date-fns";
import { Form } from "react-bootstrap";
import { todayEAT } from "./eatDate";
import { dateToYmdEat, ymdToDateEat } from "./filterDateUtils";

type CalendarContainerProps = ComponentProps<typeof CalendarContainer>;

export interface FilterDatePickerProps {
  id?: string;
  label?: string;
  /** yyyy-MM-dd; empty string when cleared if allowEmpty */
  value: string;
  onChange: (ymd: string) => void;
  disabled?: boolean;
  /** Allow clearing the value (Clear control + clear icon). Default true. */
  allowEmpty?: boolean;
  /** Show Clear / Today row under the calendar. Default true. */
  showFooterActions?: boolean;
  /** Input display format (wire format stays yyyy-MM-dd via onChange). */
  dateFormat?: string;
  minDate?: Date;
  maxDate?: Date;
  placeholderText?: string;
  wrapperClassName?: string;
  className?: string;
}

export default function FilterDatePicker({
  id,
  label,
  value,
  onChange,
  disabled = false,
  allowEmpty = true,
  showFooterActions = true,
  dateFormat = "MM/dd/yyyy",
  minDate,
  maxDate,
  placeholderText = "Select date",
  wrapperClassName,
  className = "",
}: FilterDatePickerProps) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const effectiveMinDate = minDate ? startOfDay(minDate) : undefined;
  const effectiveMaxDate = maxDate ? endOfDay(maxDate) : undefined;

  const selected = useMemo(() => {
    const raw = value?.trim();
    let d: Date | null = null;
    if (raw) {
      d = ymdToDateEat(raw);
    }
    if (!d && !allowEmpty) {
      d = ymdToDateEat(todayEAT());
    }
    if (!d) {
      return null;
    }
    if (effectiveMaxDate && d.getTime() > effectiveMaxDate.getTime()) {
      return effectiveMaxDate;
    }
    if (effectiveMinDate && d.getTime() < effectiveMinDate.getTime()) {
      return effectiveMinDate;
    }
    return d;
  }, [value, allowEmpty, effectiveMinDate, effectiveMaxDate]);

  const CalendarWrapper = useMemo(() => {
    function Wrapper(p: CalendarContainerProps) {
      return (
        <div className="filter-datepicker-popover-root">
          <CalendarContainer {...p} />
          {showFooterActions ? (
            <div
              className={`filter-datepicker-footer d-flex align-items-center px-2 py-2 border-top border-secondary-subtle bg-white ${
                allowEmpty ? "justify-content-between" : "justify-content-end"
              }`}
            >
              {allowEmpty ? (
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 text-primary text-decoration-none"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onChangeRef.current("")}
                >
                  Clear
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn-link btn-sm p-0 text-primary text-decoration-none"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onChangeRef.current(todayEAT())}
              >
                Today
              </button>
            </div>
          ) : null}
        </div>
      );
    }
    Wrapper.displayName = "FilterDateCalendarWrapper";
    return Wrapper;
  }, [showFooterActions, allowEmpty]);

  return (
    <div className={wrapperClassName}>
      {label ? <Form.Label htmlFor={id}>{label}</Form.Label> : null}
      <DatePicker
        id={id}
        selected={selected}
        onChange={(d: Date | null) => {
          if (!d) {
            if (allowEmpty) onChange("");
            return;
          }
          onChange(dateToYmdEat(d));
        }}
        dateFormat={dateFormat}
        className={`form-control ${className}`.trim()}
        wrapperClassName="w-100"
        placeholderText={placeholderText}
        disabled={disabled}
        minDate={effectiveMinDate}
        maxDate={effectiveMaxDate}
        isClearable={allowEmpty}
        showIcon
        toggleCalendarOnIconClick
        calendarContainer={CalendarWrapper}
        showMonthYearDropdown
        dropdownMode="select"
      />
    </div>
  );
}
