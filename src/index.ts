import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { etag } from 'hono/etag';

/**
 * Types
 */
type Bindings = {
  DB: D1Database;
};
// Requests
export type UserAddRequest = {
  email: string;
};
export type DailyRolyPolyCountUpRequest = {
  direction: 'east' | 'west' | 'south' | 'north';
};
export type DailyOthersCountUpRequest = {
  object: 'dog' | 'cat' | 'butterfly';
};
// Responses
// DB table definitions
export type User = {
  id: number;
  email: string;
};
export type ExistsRecord = {
  exists_record: number;
};
export type DailyRolyPolyDirectionCounts = {
  id: number;
  user_id: number;
  date: string;
  east: number;
  west: number;
  south: number;
  north: number;
};
export type DailyOthersCounts = {
  id: number;
  user_id: number;
  date: string;
  dog: number;
  cat: number;
  butterfly: number;
};

/**
 * App
 */
const app = new Hono<{ Bindings: Bindings }>();
app.use('*', cors(), etag());

/**
 * Endpoints
 */
// user: Get user (id)
app.get('/users/:userId', async (context) => {
  try {
    // Request
    const userId = Number(context.req.param('userId'));
    if (!Number.isInteger(userId)) {
      return context.json({ error: 'Invalid request' }, 400);
    }

    // Main
    const record = await context.env.DB.prepare('SELECT * FROM users WHERE id = ?1').bind(userId).first<User>();
    if (typeof record === 'undefined' || !record) {
      return context.json({ error: 'Not found' }, 404);
    }

    // Response
    return context.json({ message: 'ok', data: record }, 200);
  } catch (e: any) {
    console.error(e.message);
    return context.json({ error: 'Internal server error' }, 500);
  }
});

// user: Get user
app.post('/users', async (context) => {
  try {
    // Request
    const body = await context.req.json<UserAddRequest>();
    if (!body.email && !body.email.match(/.+@.+\..+/)) {
      return context.json({ error: 'Invalid request' }, 400);
    }
    const email = body.email;

    // Main
    const record = await context.env.DB.prepare('SELECT * FROM users WHERE email = ?1').bind(email).first<User>();
    if (typeof record === 'undefined' || !record) {
      return context.json({ error: 'Not found' }, 404);
    }

    // Response
    return context.json({ message: 'ok', data: record }, 200);
  } catch (e: any) {
    console.error(e.message);
    return context.json({ error: 'Internal server error' }, 500);
  }
});

// user: Add user
app.post('/users', async (context) => {
  try {
    // Request
    const body = await context.req.json<UserAddRequest>();
    if (!body.email && !body.email.match(/.+@.+\..+/)) {
      return context.json({ error: 'Invalid request' }, 400);
    }

    // Main
    const result = await context.env.DB.prepare('INSERT INTO users (email) VALUES (?1)').bind(body.email).run();
    if (!result.success) {
      return context.json({ message: 'Failed to register' }, 500);
    }

    // Response
    return context.json({ message: 'ok' }, 200);
  } catch (e: any) {
    console.error(e.message);
    return context.json({ error: 'Internal server error' }, 500);
  }
});

// roly-poly: Today count up
app.post('/roly-poly/:userId', async (context) => {
  try {
    // Request
    const userId = Number(context.req.param('userId'));
    if (!Number.isInteger(userId)) {
      return context.json({ error: 'Invalid request' }, 400);
    }
    const body = await context.req.json<DailyRolyPolyCountUpRequest>();
    if (!body.direction) {
      return context.json({ error: 'Invalid request' }, 400);
    }
    const direction = body.direction;
    if (direction != 'east' && direction != 'west' && direction != 'south' && direction != 'north') {
      return context.json({ error: 'Invalid request' }, 400);
    }

    // Main
    // NOTE: The "sv-SE" locale is "YYYY-MM-DD" format.
    const todayStr = new Date().toLocaleDateString('sv-SE');
    const existsResult = await context.env.DB.prepare(
      'SELECT EXISTS (SELECT * FROM daily_roly_poly_direction_counts WHERE user_id = ?1 AND date = ?2) as exists_record'
    )
      .bind(userId, todayStr)
      .first<ExistsRecord>();
    if (typeof existsResult === 'undefined' || !existsResult) {
      return context.json({ message: 'Failed to register' }, 500);
    }
    if (existsResult.exists_record <= 0) {
      // Insert if not exists.
      const insertResult = await context.env.DB.prepare('INSERT INTO daily_roly_poly_direction_counts (user_id, date) VALUES (?1, ?2)')
        .bind(userId, todayStr)
        .run();
      if (!insertResult.success) {
        return context.json({ message: 'Failed to register' }, 500);
      }
    }

    const updateResult = await context.env.DB.prepare(
      `UPDATE daily_roly_poly_direction_counts SET ${direction} = ${direction} + 1 WHERE user_id = ?1 AND date = ?2`
    )
      .bind(userId, todayStr)
      .run();
    if (!updateResult.success) {
      return context.json({ message: 'Failed to register' }, 500);
    }

    // Response
    return context.json({ message: 'ok' }, 200);
  } catch (e: any) {
    console.error(e.message);
    return context.json({ error: 'Internal server error' }, 500);
  }
});

// roly-poly: Get today count
app.get('/roly-poly/:userId', async (context) => {
  try {
    // Request
    const userId = Number(context.req.param('userId'));
    if (!Number.isInteger(userId)) {
      return context.json({ error: 'Invalid request' }, 400);
    }

    // Main
    // NOTE: The "sv-SE" locale is "YYYY-MM-DD" format.
    const todayStr = new Date().toLocaleDateString('sv-SE');
    const record = await context.env.DB.prepare('SELECT * FROM daily_roly_poly_direction_counts WHERE user_id = ?1 AND date = ?2')
      .bind(userId, todayStr)
      .first<DailyRolyPolyDirectionCounts>();
    if (typeof record === 'undefined' || !record) {
      return context.json({ error: 'Not found' }, 404);
    }

    // Response
    return context.json(
      {
        message: 'ok',
        data: {
          east: record.east,
          west: record.west,
          south: record.south,
          north: record.north,
        },
      },
      200
    );
  } catch (e: any) {
    console.error(e.message);
    return context.json({ error: 'Internal server error' }, 500);
  }
});

// roly-poly: Get count
app.get('/roly-poly/:userId/:year/:month/:day', async (context) => {
  try {
    // Request
    const userId = Number(context.req.param('userId'));
    const year = Number(context.req.param('year'));
    const month = Number(context.req.param('month'));
    const day = Number(context.req.param('day'));
    if (!Number.isInteger(userId) || !Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
      return context.json({ error: 'Invalid request' }, 400);
    }

    // Main
    // NOTE: The "sv-SE" locale is "YYYY-MM-DD" format.
    const dayStr = new Date(year, month - 1, day).toLocaleDateString('sv-SE');
    const record = await context.env.DB.prepare('SELECT * FROM daily_roly_poly_direction_counts WHERE user_id = ?1 AND date = ?2')
      .bind(userId, dayStr)
      .first<DailyRolyPolyDirectionCounts>();
    if (typeof record === 'undefined' || !record) {
      return context.json({ error: 'Not found' }, 404);
    }

    // Response
    return context.json(
      {
        message: 'ok',
        data: {
          east: record.east,
          west: record.west,
          south: record.south,
          north: record.north,
        },
      },
      200
    );
  } catch (e: any) {
    console.error(e.message);
    return context.json({ error: 'Internal server error' }, 500);
  }
});

// others: Today count up
app.post('/others/:userId', async (context) => {
  try {
    // Request
    const userId = Number(context.req.param('userId'));
    if (!Number.isInteger(userId)) {
      return context.json({ error: 'Invalid request' }, 400);
    }
    const body = await context.req.json<DailyOthersCountUpRequest>();
    if (!body.object) {
      return context.json({ error: 'Invalid request' }, 400);
    }
    const object = body.object;
    if (object != 'dog' && object != 'cat' && object != 'butterfly') {
      return context.json({ error: 'Invalid request' }, 400);
    }

    // Main
    // NOTE: The "sv-SE" locale is "YYYY-MM-DD" format.
    const todayStr = new Date().toLocaleDateString('sv-SE');
    const existsResult = await context.env.DB.prepare(
      'SELECT EXISTS (SELECT * FROM daily_others_counts WHERE user_id = ?1 AND date = ?2) as exists_record'
    )
      .bind(userId, todayStr)
      .first<ExistsRecord>();
    if (typeof existsResult === 'undefined' || !existsResult) {
      return context.json({ message: 'Failed to register' }, 500);
    }
    if (existsResult.exists_record <= 0) {
      // Insert if not exists.
      const insertResult = await context.env.DB.prepare('INSERT INTO daily_others_counts (user_id, date) VALUES (?1, ?2)')
        .bind(userId, todayStr)
        .run();
      if (!insertResult.success) {
        return context.json({ message: 'Failed to register' }, 500);
      }
    }

    const updateResult = await context.env.DB.prepare(
      `UPDATE daily_others_counts SET ${object} = ${object} + 1 WHERE user_id = ?1 AND date = ?2`
    )
      .bind(userId, todayStr)
      .run();
    if (!updateResult.success) {
      return context.json({ message: 'Failed to register' }, 500);
    }

    // Response
    return context.json({ message: 'ok' }, 200);
  } catch (e: any) {
    console.error(e.message);
    return context.json({ error: 'Internal server error' }, 500);
  }
});

// others: Get today count
app.get('/others/:userId', async (context) => {
  try {
    // Request
    const userId = Number(context.req.param('userId'));
    if (!Number.isInteger(userId)) {
      return context.json({ error: 'Invalid request' }, 400);
    }

    // Main
    // NOTE: The "sv-SE" locale is "YYYY-MM-DD" format.
    const todayStr = new Date().toLocaleDateString('sv-SE');
    const record = await context.env.DB.prepare('SELECT * FROM daily_others_counts WHERE user_id = ?1 AND date = ?2')
      .bind(userId, todayStr)
      .first<DailyOthersCounts>();
    if (typeof record === 'undefined' || !record) {
      return context.json({ error: 'Not found' }, 404);
    }

    // Response
    return context.json(
      {
        message: 'ok',
        data: {
          dog: record.dog,
          cat: record.cat,
          butterfly: record.butterfly,
        },
      },
      200
    );
  } catch (e: any) {
    console.error(e.message);
    return context.json({ error: 'Internal server error' }, 500);
  }
});

// others: Get count
app.get('/others/:userId/:year/:month/:day', async (context) => {
  try {
    // Request
    const userId = Number(context.req.param('userId'));
    const year = Number(context.req.param('year'));
    const month = Number(context.req.param('month'));
    const day = Number(context.req.param('day'));
    if (!Number.isInteger(userId) || !Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
      return context.json({ error: 'Invalid request' }, 400);
    }

    // Main
    // NOTE: The "sv-SE" locale is "YYYY-MM-DD" format.
    const dayStr = new Date(year, month - 1, day).toLocaleDateString('sv-SE');
    const record = await context.env.DB.prepare('SELECT * FROM daily_others_counts WHERE user_id = ?1 AND date = ?2')
      .bind(userId, dayStr)
      .first<DailyOthersCounts>();
    if (typeof record === 'undefined' || !record) {
      return context.json({ error: 'Not found' }, 404);
    }

    // Response
    return context.json(
      {
        message: 'ok',
        data: {
          dog: record.dog,
          cat: record.cat,
          butterfly: record.butterfly,
        },
      },
      200
    );
  } catch (e: any) {
    console.error(e.message);
    return context.json({ error: 'Internal server error' }, 500);
  }
});

export default app;
