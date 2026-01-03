import "./Calendar.css";
import {useState} from "react";

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SHIFT_ASSIGNMENTS = {
  "2025-12-25": [{ station: "Security", name: "John Doe" }],
  "2025-12-27": [{ station: "Lead", name: "Jane Smith" }, { station: "Radio", name: "Alex R." }, { station: "Radio", name: "Alex R." }],
};

const CalendarPage = () => {
  const [currentDate] = useState(new Date(2025, 11, 27)); // Dec 27, 2025

  const generateCalendarDays = () => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const days = [];
    // Padding for days from previous month to align start of week
    for (let i = 0; i < startOfMonth.getDay(); i++) {
      days.push({ day: null, dateKey: null });
    }
    // Current month days
    for (let d = 1; d <= endOfMonth.getDate(); d++) {
      const dateKey = `2025-12-${d.toString().padStart(2, '0')}`;
      days.push({ day: d, dateKey });
    }
    return days;
  };

  return(
    <div>
      <section className="month-buttons">
        <button className="previous-month">Previous Month</button>
        <h2>{currentDate.getMonth()}, {currentDate.getFullYear()}</h2>
        <button className="next-month">Next Month</button>
      </section>

      <div className="workspace">
        {/* The Watchbill Grid */}

        <section className="calendar-container">
          <div className="calendar-header">
            {DAY_LABELS.map(day => (
              <div key={day} className="day-label">{day}</div>
            ))}
          </div>

          {/* Calendar Grid */}
            <div className="calendar-grid">
              {generateCalendarDays().map((item, index) => (
                <div key={index} className={`calendar-day ${!item.day ? 'empty' : ''}`}>
                  <span className="day-number">{item.day}</span>
                  <div className="day-events">
                    {item.dateKey && SHIFT_ASSIGNMENTS[item.dateKey]?.map((shift, i) => (
                      <div key={i} className="calendar-shift-badge">
                        <strong>{shift.station.charAt(0)}:</strong> {shift.name}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
      </div>
    </div>
  )
};

export default CalendarPage;