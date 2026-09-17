import { startTestDatabase } from "./testcontainers-db.ts";

let stop: () => Promise<void>;

export async function setup(): Promise<void> {
  ({ stop } = await startTestDatabase());
}

export async function teardown(): Promise<void> {
  await stop();
}
