import { type DbTransactionType, db } from "@/lib/drizzle-db";

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
  const turnId = 'turnId' in props ? props.turnId : 0;
  const scopedIds = await (tx ? tx : db).execute(
    `SELECT * FROM allocate_scoped_ids('${tableName}', '${chatId}', ${turnId}, ${count})`,
  );
  const ret: Array<number> = scopedIds.map(
    (x) => x.allocate_scoped_ids as number,
  );
  return ret;
};
