import { Context } from 'hono';
import { DailyOthersCountUpRequest, DailyOthersCounts, Env, ExistsRecord } from '../types';
import { format } from '@formkit/tempo';

/**
 * Get count.
 *
 * @param context
 * @returns
 */
export const getCount = async (context: Context<Env>) => {
  // Request
  const userId = Number(context.req.param('userId'));
  if (!Number.isInteger(userId)) {
    return context.json({ error: 'Invalid request' }, 400);
  }
  const day = context.req.query('day');
  if (!day) {
    return context.json({ error: 'Invalid request' }, 400);
  }

  try {
    const dayStr = format({ date: day, format: 'YYYY-MM-DD' });
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
};

/**
 * Count up.
 *
 * @param context
 * @returns
 */
export const countUp = async (context: Context<Env>) => {
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
  const day = body.day;
  if (!day) {
    return context.json({ error: 'Invalid request' }, 400);
  }

  // Main
  try {
    const dayStr = format({ date: day, format: 'YYYY-MM-DD' });
    const existsResult = await context.env.DB.prepare(
      'SELECT EXISTS (SELECT * FROM daily_others_counts WHERE user_id = ?1 AND date = ?2) as exists_record'
    )
      .bind(userId, dayStr)
      .first<ExistsRecord>();
    if (typeof existsResult === 'undefined' || !existsResult) {
      return context.json({ message: 'Failed to register' }, 500);
    }
    if (existsResult.exists_record <= 0) {
      // Insert if not exists.
      const insertResult = await context.env.DB.prepare('INSERT INTO daily_others_counts (user_id, date) VALUES (?1, ?2)')
        .bind(userId, dayStr)
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
};
