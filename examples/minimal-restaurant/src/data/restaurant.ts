export const restaurant = {
  legalName: 'Example Restaurant LLC',
  shortName: 'Example',
  name: 'Example Restaurant',
  tagline: 'A demo of the @scottynvme/owner-portal integration',
  cuisine: 'Mexican',

  // owner-editable below ↓
  hours: {
    Mon: '11:00-21:00',
    Tue: '11:00-21:00',
    Wed: '11:00-21:00',
    Thu: '11:00-21:00',
    Fri: '11:00-22:00',
    Sat: '11:00-22:00',
    Sun: '11:00-21:00',
  },
  hoursDisplay: {
    label: 'Open every day',
    value: '11 AM to 9 PM',
  },
  phones: [
    { label: 'Main', number: '+15555551234', display: '(555) 555-1234' },
  ],
  // ↑ owner-editable

  address: { street: '123 Example St', city: 'Demo City', state: 'NJ', zip: '07000' },
};
