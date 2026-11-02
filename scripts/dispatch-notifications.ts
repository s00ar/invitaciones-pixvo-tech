import { dispatchNotifications } from "../src/server/notifications";
console.log(await dispatchNotifications());
await globalThis.pixvoPool?.end();
await (await globalThis.pixvoDb)?.close();
