/**
 * @fileoverview Enhanced Select For Grid Utility with Query Cloning
 * 
 * This module provides utilities that work with the query cloning approach
 * to eliminate duplicate query crafting for main vs count queries.
 * 
 * @module lib/components/mui/data-grid/selectForGridV2
 * @version 2.0.0
 * @since 2025-07-27
 */

import type { DrizzleSelectQuery } from './types';
import { drizDb } from '@/lib/drizzle-db';
import { AnyPgSelect, PgSession } from 'drizzle-orm/pg-core';
import type { PgCountBuilder } from 'drizzle-orm/pg-core/query-builders/count';



export const countQueryFactory = 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(select: DrizzleSelectQuery): { select: DrizzleSelectQuery, count: PgCountBuilder<PgSession<any, any, any>>} => 
{
  const db = drizDb();
  const subQ = (select as AnyPgSelect).as('app_subq_count');  
  return {
    select: db.select().from(subQ),
    count: db.$count(subQ),
  };
};
