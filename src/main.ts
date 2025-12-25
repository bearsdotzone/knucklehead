import { Engine, Task } from "grimoire-kolmafia";
import {
  cliExecute
} from "kolmafia";

const TaskTest: Task = {
  name: "Test",
  completed: () => false,
  do: () => {
    cliExecute("print bears");
  },
  limit: { skip: 1 },
};

export function main(): void {
  const engine = new Engine([
    TaskTest
  ]);
  engine.run();
}
