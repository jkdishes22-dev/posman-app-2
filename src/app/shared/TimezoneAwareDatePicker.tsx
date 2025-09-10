import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

/**
 * Get the application timezone
 * Uses local timezone by default
 */
const getAppTimezone = (): string => {
  // Use local timezone
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

const timeZone = getAppTimezone();

const TimeZoneAwareDatePicker = ({
  onDateChange,
  format = "yyyy-MM-dd HH:mm",
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const convertToTimeZone = (date: Date | null) => (date ? toZonedTime(date, timeZone) : null);

  const convertToUtc = (date: Date | null) => (date ? fromZonedTime(date, timeZone) : null);

  const handleChange = (date: Date | null) => {
    setSelectedDate(date);
    if (onDateChange) {
      if (date) {
        const utcDate = convertToUtc(date);
        onDateChange(utcDate);
      } else {
        onDateChange(null);
      }
    }
  };

  return (
    <DatePicker
      className="form-control me-3"
      selected={selectedDate ? convertToTimeZone(selectedDate) : null}
      onChange={handleChange}
      //   showTimeSelect
      dateFormat={format}
      maxDate={new Date()}
      placeholderText="Select billing date"
      isClearable
    />
  );
};

export default TimeZoneAwareDatePicker;
