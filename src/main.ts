import { CombatStrategy, Engine, Quest, step, Task } from "grimoire-kolmafia";
import {
  autosell,
  availableAmount,
  buy,
  eat,
  mallPrice,
  myAdventures,
  myHp,
  myMaxhp,
  myMaxmp,
  myMp,
  putShop,
  restoreMp,
  runChoice,
  takeStorage,
  use,
  useSkill,
  visit,
  visitUrl,
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
  have,
  KolGender,
  Lifestyle,
  Macro,
} from "libram";

const TaskLoop: Task = {
  name: "Ascending",
  acquire: [
    {
      item: $item`gallon of milk`,
      num: 3,
      price: 5000,
    },
  ],
  completed: () => !get("kingLiberated"),
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
    runChoice(1);
  },
  post: () => takeStorage($item`small peppermint-flavored sugar walking crook`, 1),
  ready: () => get("kingLiberated") && get(`_knuckleboneDrops`) === 100,
  limit: { tries: 1 },
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

const TaskDiet: Task = {
  name: "Diet",
  completed: () => myAdventures() >= 100 - get(`_knuckleboneDrops`),
  do: () => {
    takeStorage($item`gallon of milk`, 1);
    eat($item`gallon of milk`);
  },
};

const QuestRecover: Quest<Task> = {
  name: "Recovering HP/MP",
  tasks: [
    {
      name: "Recover",
      ready: () => have($skill`Cannelloni Cocoon`),
      completed: () => myHp() / myMaxhp() >= 0.75,
      do: () => {
        useSkill($skill`Cannelloni Cocoon`);
      }
    },
    {
      name: "Recover Failed",
      completed: () => myHp() / myMaxhp() >= 0.5,
      do: () => {
        throw "Unable to heal above 50% HP, heal yourself!";
      }
    },
    {
      name: "Recover MP",
      completed: () => myMp() >= Math.min(250, myMaxmp()),
      do: () => restoreMp(300)
    }
  ]
}

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
    completed: true,
  },
};

export function main(): void {
  const engine = new Engine([
    TaskLoop,
    // TaskGetScripts,
    TaskUnlockStore,
    TaskStarterFunds,
    TaskDiet,
    ...QuestRecover.tasks,
    TaskFightSkeletons,
    TaskBuyLoot,
  ]);
  engine.run();
}
