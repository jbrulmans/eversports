import express from 'express';

import { errorHandler } from './error-handler.middleware';
import legacyMembershipRoutes from './legacy/routes/membership.routes';
import membershipRoutes from './modern/routes/membership.routes';

const app = express();
const port = 3099;

app.use(express.json());
app.use('/memberships', membershipRoutes);
app.use('/legacy/memberships', legacyMembershipRoutes);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${String(port)}`);
});
