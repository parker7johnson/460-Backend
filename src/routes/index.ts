import express, { Router } from 'express';

import { authRoutes } from './auth';
import { closedRoutes } from './closed';

const routes: Router = express.Router();

routes.use(authRoutes);
routes.use(closedRoutes);

export { routes };
