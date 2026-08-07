declare module "express" {
  export interface Request {
    [key: string]: any;
  }

  export interface Response {
    status(code: number): Response;
    json(body: any): Response;
  }

  export type NextFunction = (err?: unknown) => void;
}
