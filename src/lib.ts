import { Item, visitUrl } from "kolmafia";

export function pricegunValue(item: Item): number {
  const pricegunData = visitUrl(`https://pricegun.loathers.net/api/${item.id}`);
  const data = JSON.parse(pricegunData) as { value: string };
  if (!data || !data.value || parseInt(data.value) <= 0) return 0;
  return parseInt(data.value);
}
