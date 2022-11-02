import { retry } from "rxjs";

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  backoff: number
) {
  let retries = 0;
  while (true) {
    try {
      return await fn();
    } catch (e) {
      if (retries >= maxRetries) {
        throw e;
      }
      retries++;
      await sleep(backoff);
    }
  }
}

export function backOff(maxTries: number, ms: number) {
  return retry({
    count: maxTries,
    delay: ms,
  });
}
