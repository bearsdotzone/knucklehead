import {
  Args,
  CombatStrategy,
  Engine,
  Outfit,
  OutfitSpec,
  Quest,
  step,
  Task,
} from "grimoire-kolmafia";
import {
  autosell,
  availableAmount,
  buy,
  buyUsingStorage,
  changeMcd,
  cliExecute,
  currentMcd,
  drinksilent,
  eat,
  haveEffect,
  haveSkill,
  Item,
  mpCost,
  myAdventures,
  myBasestat,
  myClass,
  myFullness,
  myHp,
  myMaxhp,
  myMp,
  print,
  pullsRemaining,
  putShopUsingStorage,
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
  $effect,
  $familiar,
  $item,
  $items,
  $location,
  $path,
  $skill,
  $stat,
  ascend,
  get,
  have,
  KolGender,
  Lifestyle,
  Macro,
  unequip,
} from "libram";
import { calculatePrice, myKnucks } from "./lib";

const args = Args.create("knucklehead", "", {
  ascend: Args.boolean({
    default: true,
    help: "Set to false to stay in run.",
  }),
  buyItem: Args.boolean({
    default: true,
    help: "Set to false to never buy the special item",
  }),
  level: Args.boolean({
    default: false,
    help: "Set to true to attempt to level to 15, should be used with -ascend",
  }),
});

const TaskLoop: Task = {
  name: "Ascending",
  completed: () => !visitUrl("place.php?whichplace=greygoo").includes("ascend.php"),
  do: () => {
    ascend({
      path: $path`Grey Goo`,
      playerClass: $class`Accordion Thief`,
      lifestyle: Lifestyle.softcore,
      kolGender: KolGender.female,
      moon: "platypus",
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
  ready: () =>
    args.ascend &&
    get(`_knuckleboneDrops`) === 100 &&
    (args.level ? myAdventures() === 0 : true) &&
    visitUrl("place.php?whichplace=greygoo").includes("ascend.php"),
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

// Consider adding an accordion
const pulls = $items`Bowl of Infinite Jelly, infinite BACON machine, small peppermint-flavored sugar walking crook, Ouija Board\, Ouija Board, can of mixed everything`;
const foods: [Item, number][] = [
  [$item`abstraction: perception`, 200],
  [$item`mini kiwitini`, 2000],
  [$item`Island Hurricane`, 900],
];
// const hurricane = $item`Island Hurricane`;
// buyUsingStorage(hurricane, 1, 900);

const TaskPulls: Task = {
  name: "Retrieving Items from Storage",
  completed: () =>
    pulls.every((i) => {
      return (
        availableAmount(i) > 0 ||
        get("_roninStoragePulls")
          .split(",")
          .find((j) => parseInt(j) === i.id)
      );
    }),
  do: () => {
    if (args.level) {
      pulls.push(
        ...$items`noir fedora, backwoods banjo, smoker's cloak, KoL Con 13 T-shirt, scorched skeleton pants, stainless steel scarf, Amulet of Perpetual Darkness, C.A.R.N.I.V.O.R.E. button, green LavaCo Lamp™`,
      );

      foods.forEach((i) => {
        pulls.push(i[0]);
        buyUsingStorage(i[0], 1, i[1]);
      });
    }
    if (myClass() === $class`Accordion Thief`) {
      pulls.push($item`alarm accordion`);
    } else {
      pulls.push($item`antique accordion`);
    }
    if (pulls.length >= 20) throw "Attempting to pull too many items from storage!";
    pulls.forEach((i) => {
      if (availableAmount(i) === 0) takeStorage(i, 1);
    });
    // Get some starting cash
    if (!args.level)
      visitUrl(
        `storage.php?name=addmeat&which=5&action=takemeat&amt=${pullsRemaining()}000`,
        true,
        true,
      );
  },
  limit: {
    tries: 2,
  },
};

const TaskDiet: Task = {
  name: "Got Milk?",
  completed: () => myFullness() === 15,
  do: () => {
    if (args.level) {
      foods.forEach((i) => {
        if (i[0].inebriety) {
          drinksilent(i[0]);
        } else if (i[0].spleen) {
          use(i[0]);
        }
      });
    }
    if (!get("_baconMachineUsed")) use($item`infinite BACON machine`);
    buy($coinmaster`Internet Meme Shop`, 1, $item`gallon of milk`);
    eat($item`gallon of milk`);
  },
  limit: {
    tries: 2,
  },
  outfit: () => (args.level ? { modifier: "moxie experience percent" } : {}),
};

const QuestRecover: Quest<Task> = {
  name: "Recovering",
  tasks: [
    {
      name: "Selling Items",
      completed: () => availableAmount($item`half of a gold tooth`) < 10,
      do: () => autosell($item`half of a gold tooth`, 10),
    },
    {
      name: "Health - Cocoon",
      ready: () => have($skill`Cannelloni Cocoon`) && myMp() >= mpCost($skill`Cannelloni Cocoon`),
      completed: () => myHp() / myMaxhp() >= 0.75,
      do: () => {
        useSkill($skill`Cannelloni Cocoon`);
      },
    },
    {
      name: "Health - Tongue",
      ready: () =>
        have($skill`Tongue of the Walrus`) && myMp() >= mpCost($skill`Tongue of the Walrus`),
      completed: () => myHp() / myMaxhp() >= 0.75,
      do: () => {
        useSkill($skill`Tongue of the Walrus`);
      },
    },
    {
      name: "MP",
      completed: () => myMp() >= 75,
      do: () => restoreMp(75),
      limit: {
        tries: 20,
      },
    },
    {
      name: "Failed",
      completed: () => myHp() / myMaxhp() >= 0.5,
      do: () => {
        throw "Unable to heal above 50% HP, heal yourself!";
      },
    },
  ],
};

const QuestBuff: Quest<Task> = {
  name: "Buffing",
  tasks: [
    {
      name: "Fat Leon's Phat Loot Lyric",
      ready: () => haveSkill($skill`Fat Leon's Phat Loot Lyric`),
      do: () => useSkill($skill`Fat Leon's Phat Loot Lyric`),
      completed: () => haveEffect($effect`Fat Leon's Phat Loot Lyric`) > 0,
    },
    {
      name: "Ur-Kel's Aria of Annoyance",
      ready: () => haveSkill($skill`Ur-Kel's Aria of Annoyance`) && args.level,
      do: () => useSkill($skill`Ur-Kel's Aria of Annoyance`),
      completed: () => haveEffect($effect`Ur-Kel's Aria of Annoyance`) > 0,
    },
    {
      name: "Empathy of the Newt",
      ready: () => haveSkill($skill`Empathy of the Newt`),
      do: () => useSkill($skill`Empathy of the Newt`),
      completed: () => haveEffect($effect`Empathy`) > 0,
    },
  ],
};

const TaskFightSkeletons: Task = {
  name: "Fight Skeletons",
  completed: () => (args.level ? myAdventures() === 0 : get("_knuckleboneDrops") === 100),
  do: $location`The Skeleton Store`,
  combat: new CombatStrategy()
    .autoattack(Macro.step("pickpocket").attack().repeat())
    .macro(Macro.step("pickpocket").attack().repeat()),
  outfit: () => {
    const outfit: OutfitSpec = {
      equip: [$item`small peppermint-flavored sugar walking crook`],
      familiar: $familiar`Skeleton of Crimbo Past`,
      modifier: "item",
    };

    if (myBasestat($stat`mysticality`) >= 30) {
      outfit["equip"]?.push($item`can of mixed everything`);
    }

    if (args.level) {
      outfit["modifier"] = "moxie experience percent, 0.1 ml";
    }

    return outfit;
  },
  choices: {
    1060: 5,
  },
  prepare: () => {
    if (args.level && currentMcd() !== 11) {
      changeMcd(11);
    }
  },
};

const enum query {
  MAYBUY,
  NOTBUYING,
  BUYING,
}

let sellPrice = -1;
let decision = query.MAYBUY;

const TaskPromptValue: Task = {
  name: "Prompt user for value",
  do: () => {
    const specialItem = get("_crimboPastDailySpecialItem") ?? $item`none`;
    if (!specialItem.tradeable || !args.buyItem) {
      decision = query.NOTBUYING;
      return;
    }
    sellPrice = calculatePrice(specialItem);

    if (sellPrice === -1) {
      print(`Not buying ${specialItem.name}`);
      decision = query.NOTBUYING;
      return;
    }

    decision = query.BUYING;
    return true;
  },
  completed: () => decision !== query.MAYBUY,
  ready: () => {
    visit($coinmaster`Skeleton of Crimbo Past`);
    return myKnucks() >= get("_crimboPastDailySpecialPrice");
  },
};

const TaskBuyLoot: Task = {
  name: "Buy SOCP Shop Item",
  ready: () => decision === query.BUYING && sellPrice !== -1,
  completed: () => get("_crimboPastDailySpecial"),
  do: () => {
    const specialItem = get("_crimboPastDailySpecialItem") ?? $item`none`;

    // buy($coinmaster`Skeleton of Crimbo Past`, 1, specialItem);
    visitUrl("main.php?talktosocp=1", false, true);
    visitUrl("choice.php?whichchoice=1567&option=4", true, true);
    print(`Listing ${specialItem.name} @ ${sellPrice}`);
    putShopUsingStorage(sellPrice, 0, specialItem);
  },
};

const TaskBedtime: Task = {
  name: "Bedtime",
  completed: () => false,
  do: () => {},
  ready: () => args.level,
  outfit: {
    beforeDress: [() => unequip($item`backwoods banjo`)],
    offhand: $item`green LavaCo Lamp™`,
  },
  limit: {
    skip: 1,
  },
};

const TaskBreakfast: Task = {
  name: "Breakfast",
  completed: () => get("breakfastCompleted"),
  do: () => cliExecute("breakfast"),
};

export function main(command?: string): void {
  Args.fill(args, command);
  if (args.help) {
    Args.showHelp(args);
    return;
  }
  const engine = new Engine([
    TaskLoop,
    TaskUnlockStore,
    TaskStarterFunds,
    TaskPulls,
    TaskDiet,
    ...QuestRecover.tasks,
    ...QuestBuff.tasks,
    TaskFightSkeletons,
    TaskPromptValue,
    TaskBuyLoot,
    TaskBedtime,
    TaskBreakfast,
  ]);
  engine.run();
}
