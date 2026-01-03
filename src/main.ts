import { CombatStrategy, Engine, Quest, step, Task } from "grimoire-kolmafia";
import {
  abort,
  autosell,
  availableAmount,
  buyUsingStorage,
  drinksilent,
  eatsilent,
  Item,
  mallPrice,
  mpCost,
  myAdventures,
  myHp,
  myLevel,
  myMaxhp,
  myMaxmp,
  myMp,
  pullsRemaining,
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
  getRemainingLiver,
  getRemainingStomach,
  have,
  KolGender,
  Lifestyle,
  Macro,
} from "libram";

const TaskLoop: Task = {
  name: "Ascending",
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
  ready: () =>
    get(`_knuckleboneDrops`) === 100 &&
    visitUrl("place.php?whichplace=greygoo").includes("ascend.php"),
  limit: { tries: 1 },
};

const TaskRetrieveGear: Task = {
  name: "Retrieve Gear from Storage",
  completed: () => availableAmount($item`small peppermint-flavored sugar walking crook`) > 0,
  do: () => takeStorage($item`small peppermint-flavored sugar walking crook`, 1),
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
    visitUrl(
      `storage.php?name=addmeat&which=5&action=takemeat&amt=${pullsRemaining()}000`,
      true,
      true,
    );
  },
};

type DietEntry = {
  item: Item;
  adventures: number;
  price: number;
  fullness: number;
  inebriety: number;
};
const dietOptions: DietEntry[] = [];

const TaskDiet: Task = {
  name: "Diet",
  completed: () => myAdventures() >= 100 - get(`_knuckleboneDrops`),
  do: () => {
    let toConsume = dietOptions.find(
      (x) =>
        ((x.fullness !== 0 && x.fullness <= getRemainingStomach()) ||
          (x.inebriety !== 0 && x.inebriety <= getRemainingLiver())) &&
        !get("_roninStoragePulls").split(",").find((i) => i === `${x.item.id}`) &&
        x.item.levelreq <= myLevel()
    );

    if (toConsume === undefined || toConsume.price >= 5000) {
      abort("Couldn't find a suitable consumable.");
    }
    toConsume = toConsume as DietEntry;

    if (toConsume.fullness) {
      buyUsingStorage(toConsume.item);
      takeStorage(toConsume.item, 1);
      eatsilent(toConsume.item);
    } else if (toConsume.inebriety) {
      buyUsingStorage(toConsume.item);
      takeStorage(toConsume.item, 1);
      drinksilent(toConsume.item);
    } else {
      abort("Didn't consume anything!");
    }
  },
  prepare: () => {
    if (dietOptions.length === 0) {
      Item.all()
        .filter((i) => i.fullness ^ i.inebriety && i.tradeable)
        .filter((i) => getAverageAdventures(i) / (i.fullness | i.inebriety) >= 60 / 25)
        .forEach((i) => {
          dietOptions.push({
            item: i,
            adventures: getAverageAdventures(i),
            price: mallPrice(i),
            fullness: i.fullness,
            inebriety: i.inebriety,
          });
        });
      dietOptions.sort((a, b) => b.adventures / b.price - a.adventures / a.price);
    }
  },
  limit: {
    tries: 19,
  },
};

const QuestRecover: Quest<Task> = {
  name: "Recovering HP/MP",
  tasks: [
    {
      name: "Funds",
      completed: () => availableAmount($item`half of a gold tooth`) < 10,
      do: () => autosell($item`half of a gold tooth`, 10),
    },
    {
      name: "Recover",
      ready: () => have($skill`Cannelloni Cocoon`) && myMp() >= mpCost($skill`Cannelloni Cocoon`),
      completed: () => myHp() / myMaxhp() >= 0.75,
      do: () => {
        useSkill($skill`Cannelloni Cocoon`);
      },
    },
    {
      name: "Recover Tongue",
      ready: () =>
        have($skill`Tongue of the Walrus`) && myMp() >= mpCost($skill`Tongue of the Walrus`),
      completed: () => myHp() / myMaxhp() >= 0.75,
      do: () => {
        useSkill($skill`Tongue of the Walrus`);
      },
    },
    {
      name: "Recover MP",
      completed: () => myMp() >= Math.min(250, myMaxmp()),
      do: () => restoreMp(300),
      limit: {
        tries: 20,
      },
    },
    {
      name: "Recover Failed",
      completed: () => myHp() / myMaxhp() >= 0.5,
      do: () => {
        throw "Unable to heal above 50% HP, heal yourself!";
      },
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
    const availableKnucklebones =
      availableAmount($item`knucklebone`) + storageAmount($item`knucklebone`);
    const specialItemValue = mallPrice(specialItem);

    return (
      availableKnucklebones >= bonePrice &&
      specialItemValue >= 5000 * bonePrice &&
      specialItem.tradeable
    );
  },
  completed: () => get("_crimboPastDailySpecial"),
  do: () => {
    const specialItem = get("_crimboPastDailySpecialItem") ?? $item`none`;
    const specialItemValue = mallPrice(specialItem);

    // buy($coinmaster`Skeleton of Crimbo Past`, 1, specialItem);
    visitUrl("main.php?talktosocp=1", false, true);
    visitUrl("choice.php?whichchoice=1567&option=4", true, true);
    putShop(specialItemValue, 1, specialItem);
  },
  limit: {
    tries: 1,
  },
};

export function main(): void {
  const engine = new Engine([
    TaskLoop,
    TaskRetrieveGear,
    TaskUnlockStore,
    TaskDiet,
    TaskStarterFunds,
    ...QuestRecover.tasks,
    TaskFightSkeletons,
    TaskBuyLoot,
  ]);
  engine.run();
}
