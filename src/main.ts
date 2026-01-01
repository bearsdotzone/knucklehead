import { CombatStrategy, Engine, Quest, step, Task } from "grimoire-kolmafia";
import {
  abort,
  autosell,
  availableAmount,
  buy,
  buyUsingStorage,
  drink,
  drinksilent,
  eat,
  Item,
  mallPrice,
  myAdventures,
  myHp,
  myMaxhp,
  myMaxmp,
  myMp,
  putShop,
  restoreMp,
  runChoice,
  storageAmount,
  takeStorage,
  use,
  useSkill,
  visit,
  visitUrl,
  wait,
} from "kolmafia";
import {
  $class,
  $coinmaster,
  $familiar,
  $item,
  $location,
  $path,
  $skill,
  ascend,
  get,
  getAverageAdventures,
  have,
  KolGender,
  Lifestyle,
  Macro,
} from "libram";

const TaskLoop: Task = {
  name: "Ascending",
  choices: {
    1419: 1
  },
  completed: () => !visitUrl("place.php?whichplace=greygoo").includes("ascend.php"),
  do: () => {
    ascend({
      path: $path`Grey Goo`,
      playerClass: $class`Accordion Thief`,
      lifestyle: Lifestyle.softcore,
      kolGender: KolGender.female,
      moon: "packrat",
      consumable: $item`none`,
      pet: $item`astral mask`,
    });
  },
  post: () => {
    while (!visitUrl("choice.php").includes("It can be goo, though")) {
      wait(1);
    }
    runChoice(1);
  },
  // prepare: () => {
  //   const gallons = storageAmount($item`gallon of milk`);
  //   buyUsingStorage($item`gallon of milk`, 3 - gallons, 5000);
  // },
  ready: () => visitUrl("place.php?whichplace=greygoo").includes("ascend.php") && get(`_knuckleboneDrops`) === 100,
  limit: { tries: 1 },
};

const TaskRetrieveGear: Task = {
  name: "Retrieve Gear from Storage",
  completed: () => availableAmount($item`small peppermint-flavored sugar walking crook`) > 0,
  do: () => takeStorage($item`small peppermint-flavored sugar walking crook`, 1)
};

const TaskUnlockStore: Task = {
  name: "Unlock Skeleton Store",
  completed: () => step("questM23Meatsmith") !== -1,
  do: () => {
    visitUrl("shop.php?whichshop=meatsmith&action=talk", true);
    runChoice(1);
  },
  limit: { tries: 1 },
};

const TaskStarterFunds: Task = {
  name: "Sell Oriole Gems",
  completed: () => step("questM05Toot") === 999,
  do: () => {
    visitUrl("tutorial.php?action=toot", true);
    use($item`letter from King Ralph XI`);
    use($item`pork elf goodies sack`);
    autosell($item`baconstone`, 5);
    autosell($item`hamethyst`, 5);
    autosell($item`porquoise`, 5);
  },
};

// const TaskGetScripts: Task = {
//   name: "Get Scripts",
//   completed: () => gitExists("C2Talon-c2t_apron-master"),
//   do: () => {
//     cliExecute("git checkout https://github.com/C2Talon/c2t_apron.git master");
//   },
//   limit: {
//     tries: 1,
//   },
// };

// const TaskDiet: Task = {
//   name: "Diet",
//   completed: () => myAdventures() >= 100 - get(`_knuckleboneDrops`),
//   do: () => {
//     cliExecute(`c2t_apron.ash`);
//   },
//   acquire: [
//     {
//       item: $item`Black and White Apron Meal Kit`,
//       price: 5000,
//     },
//   ],
//   prepare: () => {
//     set("autoSatisfyWithMall", true);
//   },
//   limit: {
//     tries: 5,
//   },
// };

// const TaskDiet: Task = {
//   name: "Diet",
//   completed: () => myAdventures() >= 100 - get(`_knuckleboneDrops`),
//   do: () => {
//     takeStorage($item`gallon of milk`, 1);
//     eat($item`gallon of milk`);
//   },
// };

const TaskDiet: Task = {
  name: "Diet",
  completed: () => myAdventures() >= 100 - get(`_knuckleboneDrops`),
  do: () => {
    type DietEntry = {
      item: Item,
      adventures: number,
      price: number,
      fullness: number,
      inebriety: number,
    };

    const dietOptions: DietEntry[] = [];
    Item.all()
      .filter(i => (i.fullness ^ i.inebriety) && i.tradeable)
      .filter(i => getAverageAdventures(i) >= 60 / 25)
      .forEach(i => {
        dietOptions.push({ item: i, adventures: getAverageAdventures(i), price: mallPrice(i), fullness: i.fullness, inebriety: i.inebriety });
      });
    dietOptions.sort((a, b) => b.adventures / b.price - a.adventures / a.price);

    let stomachCapacity = 15;
    let liverCapacity = 14;

    const toConsume: DietEntry[] = [];

    for (const entry of dietOptions) {
      if (entry.fullness !== 0 && entry.fullness <= stomachCapacity) {
        toConsume.push(entry);
        stomachCapacity -= entry.fullness;
      }
      if (entry.inebriety !== 0 && entry.inebriety <= liverCapacity) {
        toConsume.push(entry);
        liverCapacity -= entry.inebriety;
      }
      if (stomachCapacity === 0 && liverCapacity === 0) {
        break;
      }
    }

    let price = 0;
    let items = "";
    for (const entry of toConsume) {
      items = items.concat(entry.item.name, " ");
      price += entry.price;
      stomachCapacity += entry.fullness;
      liverCapacity += entry.inebriety;
    }

    if (price > 10000) {
      abort("The price of this diet is too high!");
    }
    if (stomachCapacity !== 15) {
      abort("Not filling enough stomach!");
    }
    if (liverCapacity !== 14) {
      abort("Not filling enough liver!");
    }

    toConsume.forEach((i) => {
      if (i.fullness) {
        buyUsingStorage(i.item);
        takeStorage(i.item, 1);
        eat(i.item);
      } else {
        buyUsingStorage(i.item);
        takeStorage(i.item, 1);
        drinksilent(i.item);
      }
    });
  },
  limit: {
    tries: 1,
  }
};

const QuestRecover: Quest<Task> = {
  name: "Recovering HP/MP",
  tasks: [
    {
      name: "Funds",
      completed: () => availableAmount($item`half of a gold tooth`) < 10,
      do: () => autosell($item`half of a gold tooth`, 10)
    },
    {
      name: "Recover",
      ready: () => have($skill`Cannelloni Cocoon`),
      completed: () => myHp() / myMaxhp() >= 0.75,
      do: () => {
        useSkill($skill`Cannelloni Cocoon`);
      },
    },
    {
      name: "Recover Failed",
      completed: () => myHp() / myMaxhp() >= 0.5,
      do: () => {
        throw "Unable to heal above 50% HP, heal yourself!";
      },
    },
    {
      name: "Recover MP",
      completed: () => myMp() >= Math.min(250, myMaxmp()),
      do: () => restoreMp(300),
    },
  ],
};

const TaskFightSkeletons: Task = {
  name: "Fight Skeletons",
  completed: () => get("_knuckleboneDrops") === 100,
  do: $location`The Skeleton Store`,
  combat: new CombatStrategy().autoattack(Macro.step("pickpocket").attack().repeat()),
  outfit: {
    familiar: $familiar`Skeleton of Crimbo Past`,
    famequip: $item`small peppermint-flavored sugar walking crook`,
    modifier: "item",
  },
  choices: {
    1060: 5,
  },
};

const TaskBuyLoot: Task = {
  name: "Buy SOCP Shop Item",
  ready: () => {
    visit($coinmaster`Skeleton of Crimbo Past`);
    const bonePrice = get("_crimboPastDailySpecialPrice");
    const specialItem = get("_crimboPastDailySpecialItem") ?? $item`none`;
    const availableKnucklebones = availableAmount($item`knucklebone`) + storageAmount($item`knucklebone`);
    const specialItemValue = mallPrice(specialItem);

    return availableKnucklebones > bonePrice && specialItemValue > 5000 * bonePrice && specialItem.tradeable;
  },
  completed: () => false,
  do: () => {
    const specialItem = get("_crimboPastDailySpecialItem") ?? $item`none`;
    const specialItemValue = mallPrice(specialItem);

    buy($coinmaster`Skeleton of Crimbo Past`, 1, specialItem);
    putShop(specialItemValue, 1, specialItem);
  },
  limit: {
    completed: true,
  }
};

export function main(): void {
  const engine = new Engine([
    TaskLoop,
    // TaskGetScripts,
    TaskRetrieveGear,
    TaskUnlockStore,
    TaskStarterFunds,
    TaskDiet,
    ...QuestRecover.tasks,
    TaskFightSkeletons,
    TaskBuyLoot,
  ]);
  engine.run();
}
