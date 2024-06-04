import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { etag } from 'hono/etag';
import { Env } from './types';
import { addUser, getUser } from './controllers/users';
import { getCount as rolyPolyGetCount, countUp as rolyPolyCountUp } from './controllers/roly-poly';
import { getCount as othersGetCount, countUp as othersCountUp } from './controllers/others';

const app = new Hono<Env>();
app.use('*', cors(), etag());

// users
app.get('/users', getUser);
app.post('/users', addUser);

// roly-poly
app.get('/roly-poly/:userId', rolyPolyGetCount);
app.post('/roly-poly/:userId', rolyPolyCountUp);

// others
app.get('/others/:userId', othersGetCount);
app.post('/others/:userId', othersCountUp);

export default app;
