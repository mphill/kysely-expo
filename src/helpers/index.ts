function firstElementOrNull<T>(array: T[]): T | null {
  if (array.length === 0) {
    return null;
  }

  return array[0];
}

function isStringIso8601(date: string): boolean {
  // @todo benchmark
  //date.includes("T") && date.includes("-") && date.includes(":")
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(date);
}

function isStringJson(value: string): boolean {
  try {
    const result = JSON.parse(value);
    return result && typeof result === "object";
  } catch {
    return false;
  }
}

function isStringBoolean(value: string): boolean {
  return value === "true" || value === "false";
}

export { firstElementOrNull, isStringIso8601, isStringJson, isStringBoolean };
