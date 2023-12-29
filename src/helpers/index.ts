function firstElementOrNull<T>(array: T[]): T | null {
  if (array.length === 0) {
    return null;
  }

  return array[0];
}

export { firstElementOrNull };
