import { NextApiHandler } from "next";

export const withMiddleware = (...middlewares: any[]) => {
  return (handler: NextApiHandler) => {
    return middlewares.reduceRight((acc, middleware) => {
      return middleware(acc);
    }, handler);
  };
};
