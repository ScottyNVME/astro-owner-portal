// A generic "sections of items" content shape — stands in for whatever a given
// client publishes (services, products, programs, FAQs, etc.). Fully editable
// through the owner portal in this example.
export const content = [
  {
    id: 'services',
    title: 'Services',
    items: [
      { name: 'Starter', detail: 'A short description of the first offering.' },
      { name: 'Standard', detail: 'A short description of the second offering.' },
      { name: 'Premium', detail: 'A short description of the third offering.' },
    ],
  },
  {
    id: 'faq',
    title: 'FAQ',
    items: [
      { name: 'Where are you located?', detail: 'Demo City, NJ.' },
      { name: 'How do I get started?', detail: 'Reach out via the phone number above.' },
    ],
  },
];
