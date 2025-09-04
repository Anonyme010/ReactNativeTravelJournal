import { useState } from "react";

export default function useCalendar() {
  const [selectedDate, setSelectedDate] = useState("");

  const markDate = (date) => {
    setSelectedDate(date);
  };

  return { selectedDate, markDate };
}
