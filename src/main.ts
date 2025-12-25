import { CombatStrategy, Engine, Task } from "grimoire-kolmafia";
import {
  cliExecute,
  getProperty,
  myAdventures,
  setProperty,
  visitUrl
} from "kolmafia";
import { $familiar, $item, $location, Macro } from "libram";

const TaskUnlockStore: Task = {
  name: "Unlock Skeleton Store",
  completed: () => getProperty("questM23Meatsmith") !== "unstarted",
  do: () => {
    visitUrl("shop.php?whichshop=meatsmith&action=talk", true);
  },
  limit: { tries: 1 },
};

const TaskDiet: Task = {
  name: "Diet",
  completed: () => myAdventures() >= 100 - parseInt(getProperty("_knuckleboneDrops")),
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
    setProperty("autoSatisfyWithMall", "true");
    cliExecute("git checkout https://github.com/C2Talon/c2t_apron.git master");
  },
  limit: {
    tries: 5,
  }
};

const TaskFightSkeletons: Task = {
  name: "Fight Skeletons",
  completed: () => getProperty("_knuckleboneDrops") === "100",
  do: $location`The Skeleton Store`,
  combat: new CombatStrategy().autoattack(Macro.attack().repeat()),
  outfit: {
    familiar: $familiar`Skeleton of Crimbo Past`,
    famequip: $item`small peppermint-flavored sugar walking crook`,
    modifier: 'item'
  },
  prepare: () => {
    setProperty("choiceAdventure1060", "5");
  }
};

export function main(): void {
  const engine = new Engine([
    TaskUnlockStore,
    TaskDiet,
    TaskFightSkeletons
  ]);
  engine.run();
}
