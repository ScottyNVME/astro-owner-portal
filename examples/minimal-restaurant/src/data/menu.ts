export type MenuItem = {
  name: string;
  price: string;
  description?: string;
};

export type MenuCategory = {
  id: string;
  title: string;
  image?: string;
  items: MenuItem[];
};

export const menu: MenuCategory[] = [
  {
    id: 'tacos',
    title: 'Tacos',
    image: '/img/food/tacos.webp',
    items: [
      { name: 'Carnitas', price: '15.00', description: 'Slow-braised pork, salsa verde, white onion, cilantro.' },
      { name: 'Pollo Asado', price: '14.00', description: 'Grilled chicken thigh, salsa roja, queso fresco.' },
      { name: 'Carne Asada', price: '16.00', description: 'Grilled steak, lime, charred jalapeño.' },
    ],
  },
  {
    id: 'sides',
    title: 'Sides',
    image: '/img/food/sides.webp',
    items: [
      { name: 'Elote', price: '8.00', description: 'Grilled corn, lime mayo, cotija, chile.' },
      { name: 'Rice and Beans', price: '6.00' },
    ],
  },
];
