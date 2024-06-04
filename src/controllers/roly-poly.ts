import { Context } from 'hono';
import { DailyRolyPolyCountUpRequest, DailyRolyPolyDirectionCounts, Env, ExistsRecord } from '../types';
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

  // Main
  try {
    const dayStr = format({ date: day, format: 'YYYY-MM-DD' });
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
  const body = await context.req.json<DailyRolyPolyCountUpRequest>();
  if (!body.direction) {
    return context.json({ error: 'Invalid request' }, 400);
  }
  const direction = body.direction;
  if (direction != 'east' && direction != 'west' && direction != 'south' && direction != 'north') {
    return context.json({ error: 'Invalid request' }, 400);
  }
  const day = context.req.query('day');
  if (!day) {
    return context.json({ error: 'Invalid request' }, 400);
  }

  // Main
  try {
    const dayStr = format({ date: day, format: 'YYYY-MM-DD' });
    const existsResult = await context.env.DB.prepare(
      'SELECT EXISTS (SELECT * FROM daily_roly_poly_direction_counts WHERE user_id = ?1 AND date = ?2) as exists_record'
    )
      .bind(userId, dayStr)
      .first<ExistsRecord>();
    if (typeof existsResult === 'undefined' || !existsResult) {
      return context.json({ message: 'Failed to register' }, 500);
    }
    if (existsResult.exists_record <= 0) {
      // Insert if not exists.
      const insertResult = await context.env.DB.prepare('INSERT INTO daily_roly_poly_direction_counts (user_id, date) VALUES (?1, ?2)')
        .bind(userId, dayStr)
        .run();
      if (!insertResult.success) {
        return context.json({ message: 'Failed to register' }, 500);
      }
    }

    const updateResult = await context.env.DB.prepare(
      `UPDATE daily_roly_poly_direction_counts SET ${direction} = ${direction} + 1 WHERE user_id = ?1 AND date = ?2`
    )
      .bind(userId, dayStr)
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
