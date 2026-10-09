import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DeliveryNote, deliveryNotePdf, formatDate, noteTotal } from './delivery-note-pdf';
import { noteStore, SavedNote } from './note-store';
import { description, ingredients } from './products';

function blankNote(): DeliveryNote {
  return {
    receiver: '',
    date: new Date().toLocaleDateString('sv-SE'),
    temperature: undefined,
    items: [{ product: 'Veg. samosa', quantity: 0 }],
  };
}

@Component({
  imports: [FormsModule],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly products = Object.keys(ingredients);
  protected readonly total = noteTotal;
  protected readonly description = description;
  protected readonly formatDate = formatDate;

  protected note = blankNote();
  protected readonly editingId = signal<number | undefined>(undefined);
  protected readonly saved = signal<SavedNote[]>([]);

  constructor() {
    this.load();
  }

  private async load() {
    const notes = await noteStore.all();
    this.saved.set(notes.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id));
  }

  private async save() {
    const id = this.editingId();
    this.editingId.set(await noteStore.save(id ? { ...this.note, id } : this.note));
    this.load();
  }

  protected available(item: DeliveryNote['items'][number]) {
    return this.products.filter(
      (product) => product === item.product || !this.note.items.some((i) => i.product === product),
    );
  }

  protected addItem() {
    const product = this.products.find((p) => !this.note.items.some((i) => i.product === p))!;
    this.note.items.push({ product, quantity: 0 });
  }

  protected removeItem(index: number) {
    this.note.items.splice(index, 1);
  }

  protected print(note: DeliveryNote = this.note) {
    window.open(URL.createObjectURL(deliveryNotePdf(note, true)));
    if (note === this.note) this.save();
  }

  protected download() {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(deliveryNotePdf(this.note));
    link.download = `foelgeseddel-${this.note.receiver}-${this.note.date}.pdf`;
    link.click();
    this.save();
  }

  protected newNote() {
    this.note = blankNote();
    this.editingId.set(undefined);
  }

  protected edit({ id, ...note }: SavedNote) {
    this.note = structuredClone(note);
    this.editingId.set(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected async remove(note: SavedNote) {
    if (!confirm(`Slet følgeseddel til ${note.receiver} (${note.date})?`)) return;
    await noteStore.remove(note.id);
    if (this.editingId() === note.id) this.newNote();
    this.load();
  }
}
