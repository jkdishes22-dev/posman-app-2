import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const timeZone = "Africa/Nairobi";

const TimeZoneAwareDatePicker = ({
  onDateChange,
  format = "yyyy-MM-dd HH:mm",  
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const convertToTimeZone = (date : Date) => toZonedTime(date, timeZone);

  const convertToUtc = (date: Date) => fromZonedTime(date, timeZone);

  const handleChange = (date : Date) => {
    setSelectedDate(date);

    const utcDate = convertToUtc(date);
    if (onDateChange) {
      onDateChange(utcDate);
    }
  };

  return (
    <DatePicker
     className="form-control me-3"
      selected={convertToTimeZone(selectedDate)}
      onChange={handleChange}
    //   showTimeSelect
      dateFormat={format}
      maxDate={new Date()}
      placeholderText="Select billing date"
    />
  );
};

export default TimeZoneAwareDatePicker;
