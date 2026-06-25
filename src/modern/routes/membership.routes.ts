import express, { Request, Response } from 'express';

import type { MembershipService } from '../services';
import type { CreateMembershipRequestBody } from '../types';
import { validateCreateMembership } from '../validators';

export function createMembershipRouter(service: MembershipService) {
  const router = express.Router();

  router.get('/', (_req: Request, res: Response) => {
    const result = service.listMemberships();

    res.status(200).json(result);
  });

  router.post('/', (req: Request<unknown, unknown, CreateMembershipRequestBody>, res: Response) => {
    const validated = validateCreateMembership(req.body);
    const result = service.createMembership(validated);

    res.status(201).json(result);
  });

  return router;
}
