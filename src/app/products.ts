import { DeliveryNote } from './delivery-note-pdf';

export const ingredients: Record<string, string[]> = {
  'Veg. samosa': ['Mel (Gluten)', 'kartofler', 'ærter', 'salt', 'chili', 'koriander', 'spidskommen', 'garam masala'],
  'Kød samosa': ['Mel (Gluten)', 'oksekød', 'kartofler', 'ærter', 'salt', 'chili', 'koriander', 'spidskommen', 'garam masala'],
  'Kylling samosa': ['Mel (Gluten)', 'kylling', 'kartofler', 'ærter', 'salt', 'chili', 'koriander', 'spidskommen', 'garam masala'],
  'Kylling momo': ['Mel (Gluten)', 'kylling'],
};

export function description(note: DeliveryNote) {
  return [...new Set(note.items.flatMap((item) => ingredients[item.product] ?? []))].join(', ');
}
