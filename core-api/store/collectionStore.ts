import type { CollectionName } from "../types";

const STORAGE_KEY = "startpadel.core-api.v10";

function canUseLocalStorage(): boolean {
  return typeof localStorage !== "undefined";
}

export function loadPersistedSnapshot(): import("../types").CoreApiSnapshot | null {
  if (!canUseLocalStorage()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as import("../types").CoreApiSnapshot;
  } catch {
    return null;
  }
}

export function persistSnapshot(snapshot: import("../types").CoreApiSnapshot): void {
  if (!canUseLocalStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function clearPersistedSnapshot(): void {
  if (!canUseLocalStorage()) return;
  localStorage.removeItem(STORAGE_KEY);
}

export class CollectionStore<T extends { id: string }> {
  private items: T[];
  private readonly _name: CollectionName;
  private readonly onChange: () => void;

  constructor(name: CollectionName, seed: T[], onChange: () => void) {
    this._name = name;
    this.onChange = onChange;
    this.items = seed.map((item) => structuredClone(item));
  }

  get name(): CollectionName {
    return this._name;
  }

  getAll(): T[] {
    return this.items.map((item) => structuredClone(item));
  }

  getById(id: string): T | null {
    const found = this.items.find((item) => item.id === id);
    return found ? structuredClone(found) : null;
  }

  find(predicate: (item: T) => boolean): T[] {
    return this.items.filter(predicate).map((item) => structuredClone(item));
  }

  upsert(item: T): T {
    const index = this.items.findIndex((current) => current.id === item.id);
    const next = structuredClone(item);
    if (index >= 0) this.items[index] = next;
    else this.items.push(next);
    this.onChange();
    return structuredClone(next);
  }

  remove(id: string): boolean {
    const before = this.items.length;
    this.items = this.items.filter((item) => item.id !== id);
    const removed = this.items.length !== before;
    if (removed) this.onChange();
    return removed;
  }

  replaceAll(items: T[]): void {
    this.items = items.map((item) => structuredClone(item));
    this.onChange();
  }

  removeWhere(predicate: (item: T) => boolean): number {
    const before = this.items.length;
    this.items = this.items.filter((item) => !predicate(item));
    const removed = before - this.items.length;
    if (removed > 0) this.onChange();
    return removed;
  }
}
