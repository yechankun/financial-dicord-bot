import { startRuntime } from "./startRuntime.js";

startRuntime().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
