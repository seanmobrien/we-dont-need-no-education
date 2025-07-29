import { type DbTransactionType, drizDbWithInit } from "@/lib/drizzle-db";

export const getNextSequence = async ({
  chatId,
  tableName,
  count = 1,
  tx,
  ...props
}:
  | {
      chatId: string;
      tableName: 'chat_turns';
      count?: number;
      tx?: DbTransactionType;
    }
  | {
      chatId: string;
      tableName: 'chat_messages';
      turnId: number;
      count?: number;
      tx?: DbTransactionType;
    }) => {
  // Check to see if a turn id was provided in context.
  // NOTE: Fallback value of 0 is used instead of undefined, as
  // this keeps turnId a number type and sumplifies use of the value
  // downstream.
  const turnId = 'turnId' in props ? props.turnId : 0;
  const scopedIds = await (tx ? Promise.resolve(tx) : drizDbWithInit()).then(db => db.execute<{ allocate_scoped_ids: number }>(
    `SELECT * FROM allocate_scoped_ids('${tableName}', '${chatId}', ${turnId}, ${count})`,
  ));
  const ret: Array<number> = scopedIds.map(
    (x) => x.allocate_scoped_ids as number,
  );
  return ret;
};
