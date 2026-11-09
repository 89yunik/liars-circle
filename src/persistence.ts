export class StorageConflictError extends Error {
  constructor() {
    super('다른 창에서 데이터가 변경되었습니다. 이 화면의 내용은 유지되며 저장은 중단됩니다. 최신 내용을 확인하려면 새로고침하세요.');
  }
}

// A failed write must retain both the previous stored value and the expected revision for retry.
export function createStoredValue<T>(key: string, initialRaw: string | null, validate: (value: unknown) => value is T, getStorage: () => Storage = () => localStorage) {
  let expected = initialRaw;
  function ensureCurrent(storage: Storage) {
    if (storage.getItem(key) !== expected) throw new StorageConflictError();
  }
  return {
    write(value: T) {
      if (!validate(value)) throw new Error('저장 데이터의 형식이 올바르지 않습니다.');
      const raw = JSON.stringify(value);
      const storage = getStorage();
      ensureCurrent(storage);
      storage.setItem(key, raw);
      expected = raw;
    },
    remove() {
      const storage = getStorage();
      ensureCurrent(storage);
      storage.removeItem(key);
      expected = null;
    },
    isCurrent() { return getStorage().getItem(key) === expected; },
  };
}
