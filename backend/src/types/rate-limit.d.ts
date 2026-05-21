declare module '@fastify/rate-limit/store/LocalStore.js' {
  class LocalStore {
    constructor(continueExceeding: boolean, exponentialBackoff: boolean, cache?: number);
    incr(
      key: string,
      cb: (error: Error | null, result?: { current: number; ttl: number }) => void,
      timeWindow: number,
      max: number,
    ): void;
    child(routeOptions: {
      continueExceeding?: boolean;
      exponentialBackoff?: boolean;
      cache?: number;
      routeInfo?: { method?: string; url?: string };
    }): LocalStore;
  }
  export default LocalStore;
}
