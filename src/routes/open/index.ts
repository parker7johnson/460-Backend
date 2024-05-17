// import express, { Router } from 'express';

// import { messageRouter } from './message';

// const openRoutes: Router = express.Router();

// openRoutes.use('/message', messageRouter);

// export { openRoutes };

import express, { Router } from 'express';

import { booksRouter } from './books';

const openRoutes: Router = express.Router();

 openRoutes.use('/books', booksRouter);

export { openRoutes };
