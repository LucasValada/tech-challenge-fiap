export default async function globalTeardown(): Promise<void> {
  if (global.__POSTGRES_CONTAINER__) {
    await global.__POSTGRES_CONTAINER__.stop();
  }
}
