import "reflect-metadata";
import { cache } from "@backend/utils/cache";
import { afterEach } from "vitest";

afterEach(() => {
  cache.clear();
});
