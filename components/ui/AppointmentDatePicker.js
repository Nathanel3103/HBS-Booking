import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const AppointmentDatePicker = ({ selectedDate, onDateChange }) => {
  // Get today's date
  const today = new Date();

  // Calculate the next day
  const minDate = new Date();
  minDate.setDate(today.getDate() + 1);

  // Calculate the max date (two months from minDate)
  const maxDate = new Date();
  maxDate.setMonth(minDate.getMonth() + 2);

  return (
    <DatePicker
      selected={selectedDate}
      onChange={onDateChange}
      minDate={minDate}
      maxDate={maxDate}
      dateFormat="yyyy-MM-dd"
      placeholderText="Select a date"
      className="border p-3 rounded-lg w-full"
    />
  );
};

export default AppointmentDatePicker;
