export function parseDay(value: string): Date | null {
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return null;
  }
  date.setUTCHours(0, 0, 0, 0);
  return date;
}
