import { Item, mallPrice, userPrompt, visitUrl } from "kolmafia";
import { get } from "libram";

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

  const input = userPrompt(
    `Knucklebones: ${knucklebonePrice}
    Mall: ${prettyPrint(valueMall)} Per: ${Math.round(valueMall / knucklebonePrice)}
    Pricegun Low: ${prettyPrint(valuePricegun)} Per: ${Math.round(valuePricegun / knucklebonePrice)}
    Pricegun Value: ${prettyPrint(valuePricegunLow)} Per: ${Math.round(valuePricegunLow / knucklebonePrice)}`.replace(
      /^\s+/gm,
      "",
    ),
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
