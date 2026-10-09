import { DeliveryNote } from './delivery-note-pdf';

export interface SavedNote extends DeliveryNote {
  id: number;
}

const db = new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open('delivery-notes', 1);
  request.onupgradeneeded = () =>
    request.result.createObjectStore('notes', { keyPath: 'id', autoIncrement: true });
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const store = (await db).transaction('notes', mode).objectStore('notes');
  return new Promise<T>((resolve, reject) => {
    const request = action(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const noteStore = {
  all: () => run<SavedNote[]>('readonly', (store) => store.getAll()),
  save: (note: DeliveryNote | SavedNote) =>
    run('readwrite', (store) => store.put(note)).then(Number),
  remove: (id: number) => run('readwrite', (store) => store.delete(id)),
};
