import { CombatStrategy, Engine, step, Task } from "grimoire-kolmafia";
import {
  availableAmount,
  buy,
  cliExecute,
  gitExists,
  mallPrice,
  myAdventures,
  putShop,
  visit,
  visitUrl
} from "kolmafia";
import { $coinmaster, $familiar, $item, $location, get, Macro, set } from "libram";

const TaskUnlockStore: Task = {
  name: "Unlock Skeleton Store",
  completed: () => step("questM23Meatsmith") !== -1,
  do: () => {
    visitUrl("shop.php?whichshop=meatsmith&action=talk", true);
  },
  limit: { tries: 1 },
};

const TaskGetScripts: Task = {
  name: "Get Scripts",
  completed: () => gitExists("C2Talon-c2t_apron-master"),
  do: () => {
    cliExecute("git checkout https://github.com/C2Talon/c2t_apron.git master");
  },
  limit: {
    tries: 1
  }
};

const TaskDiet: Task = {
  name: "Diet",
  completed: () => myAdventures() >= 100 - get(`_knuckleboneDrops`),
  do: () => {
    cliExecute(`c2t_apron.ash`);
  },
  acquire: [
    {
      item: $item`Black and White Apron Meal Kit`,
      price: 5000,
    }
  ],
  prepare: () => {
    set("autoSatisfyWithMall", true);
  },
  limit: {
    tries: 5,
  }
};

const TaskFightSkeletons: Task = {
  name: "Fight Skeletons",
  completed: () => get("_knuckleboneDrops") === 100,
  do: $location`The Skeleton Store`,
  combat: new CombatStrategy().autoattack(Macro.attack().repeat()),
  outfit: {
    familiar: $familiar`Skeleton of Crimbo Past`,
    famequip: $item`small peppermint-flavored sugar walking crook`,
    modifier: 'item'
  },
  choices: {
    1060: 5
  }
};

const TaskBuyLoot: Task = {
  name: "Buy SOCP Shop Item",
  ready: () => {
    const bonePrice = get("_crimboPastDailySpecialPrice");
    const specialItem = get("_crimboPastDailySpecialItem") ?? $item`big rock`;
    const availableKnucklebones = availableAmount($item`knucklebone`);
    const specialItemValue = mallPrice(specialItem);

    return availableKnucklebones > bonePrice && specialItemValue > 5000 * bonePrice;
  },
  completed: () => false,
  prepare: () => {
    visit($coinmaster`Skeleton of Crimbo Past`);
  },
  do: () => {
    const specialItem = get("_crimboPastDailySpecialItem") ?? $item`big rock`;
    const specialItemValue = mallPrice(specialItem);

    buy($coinmaster`Skeleton of Crimbo Past`, 1, specialItem);
    putShop(specialItemValue, 1, specialItem);
  },
  limit: {
    completed: true
  }
};

export function main(): void {
  const engine = new Engine([
    TaskGetScripts,
    TaskUnlockStore,
    TaskDiet,
    TaskFightSkeletons,
    TaskBuyLoot
  ]);
  engine.run();
}
