import express, { Request, Response } from 'express';

const router = express.Router();

router.get('/', (_req: Request, _res: Response) => {
  throw new Error('not implemented');
});

router.post('/', (_req: Request, _res: Response) => {
  throw new Error('not implemented');
});

export default router;
