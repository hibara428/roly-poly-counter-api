import { Context } from 'hono';
import { Env, User, UserAddRequest } from '../types';

/**
 * Get a user.
 *
 * @param context
 * @returns
 */
export const getUser = async (context: Context<Env>) => {
  // Request
  const userId = Number(context.req.query('id'));
  const email = context.req.query('email');
  if (!userId && !email) {
    return context.json({ error: 'Invalid request' }, 400);
  }
  if (userId && !Number.isInteger(userId)) {
    return context.json({ error: 'Invalid request' }, 400);
  }
  if (email && !email.match(/.+@.+\..+/)) {
    return context.json({ error: 'Invalid request' }, 400);
  }

  // Main
  const addStmts = [];
  const binds = [];
  if (userId) {
    addStmts.push('id = ?');
    binds.push(userId);
  }
  if (email) {
    addStmts.push('email = ?');
    binds.push(email);
  }

  try {
    let stmt = context.env.DB.prepare('SELECT * FROM users WHERE ' + addStmts.join(' '));
    binds.forEach((bind: string | number) => {
      stmt = stmt.bind(bind);
    });
    const record = await stmt.first<User>();
    if (typeof record === 'undefined' || !record) {
      return context.json({ error: 'Not found' }, 404);
    }

    // Response
    return context.json({ message: 'ok', data: record }, 200);
  } catch (e: any) {
    console.error(e.message);
    return context.json({ error: 'Internal server error' }, 500);
  }
};

/**
 * Add a user.
 *
 * @param context
 * @returns
 */
export const addUser = async (context: Context<Env>) => {
  // Request
  const body = await context.req.json<UserAddRequest>();
  if (!body.email && !body.email.match(/.+@.+\..+/)) {
    return context.json({ error: 'Invalid request' }, 400);
  }
  const email = body.email;

  try {
    // Main
    const result = await context.env.DB.prepare('INSERT INTO users (email) VALUES (?1)').bind(email).run();
    if (!result.success) {
      return context.json({ message: 'Failed to register' }, 500);
    }

    const record = await context.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<User>();
    if (typeof record === 'undefined' || !record) {
      return context.json({ error: 'Not found' }, 404);
    }

    // Response
    return context.json({ message: 'ok', data: record }, 200);
  } catch (e: any) {
    console.error(e.message);
    return context.json({ error: 'Internal server error' }, 500);
  }
};
