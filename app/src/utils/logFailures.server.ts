/**
 * Machines turn actor failures into states, so the error itself never
 * reaches the route. Wrap server actor implementations with this to keep
 * failures in the server log.
 * @module
 */

export async function logFailures<T>(label: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    console.error(label, e);
    throw e;
  }
}
