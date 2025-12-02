//This class is responsible for rendering the date picker component
import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';


function DatePickerComponent() {
    const [selectedDate, setSelectedDate] = useState(null);

    return (
        <div className="date-picker-container">
            <label htmlFor="date-picker">Select Date:</label>
            <DatePicker
                id="date-picker"
                selected={selectedDate}
                onChange={date => setSelectedDate(date)}
                dateFormat="yyyy/MM/dd"
                className="date-picker-input"
            />
        </div>
    );
}
export default DatePickerComponent;

