const timeZone = "Asia/Jakarta";

const clock = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone,
});

const dayMonth = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  timeZone,
});

export function formatClock(value: string | Date) {
  return clock.format(new Date(value));
}

export function formatDay(value: string | Date) {
  return dayMonth.format(new Date(value));
}

export function formatStamp(value: string | Date) {
  const date = new Date(value);
  return `${dayMonth.format(date)} pukul ${clock.format(date)}`;
}
