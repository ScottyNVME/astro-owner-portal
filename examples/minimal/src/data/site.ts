// Generic, domain-agnostic site data. Swap this shape for whatever your
// client's site needs — the owner portal only cares about the file path +
// (optionally) which fields are owner-editable.
export const site = {
  name: 'Example Business',
  tagline: 'A demo of the @scottynvme/owner-portal integration',

  // owner-editable below ↓
  hours: {
    Mon: '9:00-17:00',
    Tue: '9:00-17:00',
    Wed: '9:00-17:00',
    Thu: '9:00-17:00',
    Fri: '9:00-16:00',
    Sat: 'By appointment',
    Sun: 'Closed',
  },
  hoursDisplay: {
    label: 'Open weekdays',
    value: '9 AM to 5 PM',
  },
  phones: [
    { label: 'Main', number: '+15555551234', display: '(555) 555-1234' },
  ],
  // ↑ owner-editable

  address: { street: '123 Example St', city: 'Demo City', state: 'NJ', zip: '07000' },
};
