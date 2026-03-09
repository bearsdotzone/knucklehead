import { availableAmount, Item, mallPrice, storageAmount, userPrompt, visitUrl } from "kolmafia";
import { $item, get } from "libram";

export function myKnucks() {
  return availableAmount($item`knucklebone`) + storageAmount($item`knucklebone`);
}

function prettyPrint(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function pricegunValue(item: Item): [number, number] {
  const pricegunData = visitUrl(`https://pricegun.loathers.net/api/${item.id}`);
  const data = JSON.parse(pricegunData) as {
    value: { __decimal__: string };
    sales: { date: string; unitPrice: { __decimal__: string }; quantity: number }[];
  };
  if (!data || !data.value || parseFloat(data.value.__decimal__) <= 0) return [0, 0];
  const lowestPrice = data.sales.reduce((acc, value) => {
    return Math.min(acc, parseInt(value.unitPrice.__decimal__));
  }, parseInt(data.sales[0].unitPrice.__decimal__));
  return [Math.floor(parseFloat(data.value.__decimal__)), lowestPrice];
}

export function calculatePrice(item: Item): number {
  const [valuePricegun, valuePricegunLow] = pricegunValue(item);
  const valueMall = mallPrice(item);
  const knucklebonePrice = get("_crimboPastDailySpecialPrice");

  const mallRatio = Math.round(valueMall / knucklebonePrice);
  const pricegunLowRatio = Math.round(valuePricegunLow / knucklebonePrice);
  const pricegunRatio = Math.round(valuePricegun / knucklebonePrice);

  if (Math.max(mallRatio, pricegunLowRatio, pricegunRatio) < 3000) return -1;

  const input = userPrompt(
    `Knucklebones: ${knucklebonePrice} Available: ${myKnucks()}
    Mall: ${prettyPrint(valueMall)} Per: ${mallRatio}
    Pricegun Low: ${prettyPrint(valuePricegunLow)} Per: ${pricegunLowRatio}
    Pricegun Value: ${prettyPrint(valuePricegun)} Per: ${pricegunRatio}`.replace(/^\s+/gm, ""),
    {
      Mall: "Mall",
      "Pricegun Low": "Pricegun Low",
      "Pricegun Value": "Pricegun Value",
      Quit: "Quit",
    },
  );
  switch (input) {
    case "Mall":
      return valueMall;
    case "Pricegun Low":
      return valuePricegunLow;
    case "Pricegun Value":
      return valuePricegun;
  }
  return -1;
}
