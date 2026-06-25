import express, { Express } from 'express';

import { errorHandler } from './error-handler.middleware';
import legacyMembershipRoutes from './legacy/routes/membership.routes';
import { InMemoryMembershipRepository } from './modern/repositories';
import { createMembershipRouter } from './modern/routes/membership.routes';
import { MembershipService } from './modern/services';

export function createApp(): Express {
  const app = express();

  app.use(express.json());

  const membershipRepository = new InMemoryMembershipRepository();
  const membershipService = new MembershipService(membershipRepository);

  app.use('/memberships', createMembershipRouter(membershipService));
  app.use('/legacy/memberships', legacyMembershipRoutes);

  app.use((_req, res) => {
    res.status(404).json({ message: 'notFound' });
  });

  app.use(errorHandler);

  return app;
}

export const app = createApp();
