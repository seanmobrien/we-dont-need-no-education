import { Session } from 'next-auth';
import {
  IResolvedServerSessionTokens,
  IServerSession,
  IServerSessionTokens,
  SessionExt,
} from './_types';
import { query, queryExt } from 'lib/neondb';
import { log } from 'lib/logger';

type ServerSessionRecord = {
  gmail: string | null;
  refresh: string;
  access: string;
};

type IServerSessionDataStore = {
  load: () => Promise<ServerSessionRecord>;
  save: (record: Partial<ServerSessionRecord>) => Promise<boolean>;
};

const serverSessionDataStoreFactory = (
  sessionId: number
): IServerSessionDataStore => {
  const transform = (record: Record<string, unknown>) => {
    return {
      gmail: (record.gmail_token as string) ?? null,
      refresh: record.refresh_token as string,
      access: record.access_token as string,
    };
  };
  const load = async () => {
    const viewRecords = await query(
      (sql) =>
        sql`SELECT token_gmail, access_token, refresh_token FROM server_sessions WHERE session_id = ${sessionId}`,
      {
        transform,
      }
    );
    if (viewRecords.length > 0) {
      return viewRecords[0];
    }
    const accountRecords = await query(
      (sql) => sql`SELECT a.refresh_token, a.access_token 
FROM (
sessions s
JOIN accounts a ON ((s."userId" = a."userId"))
    )
WHERE s.id = ${sessionId}`,
      {
        transform,
      }
    );
    return accountRecords[0];
  };
  const save = async (record: Partial<ServerSessionRecord>) => {
    // BZuild dynamic update query
    const updateFields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;
    const { gmail } = record;
    if (gmail) {
      updateFields.push(`token_gmail = $${paramIndex++}`);
      values.push(gmail);
    }
    values.push(sessionId); // Add session id as the last parameter

    const result = await queryExt((sql) =>
      sql<false, true>(
        `UPDATE session_ext SET ${updateFields.join(
          ', '
        )} WHERE session_id = $${paramIndex}`.toString(),
        values
      )
    );
    return result.rowCount === 1;
  };

  return {
    load,
    save,
  };
};

export class ServerSession implements IServerSession {
  readonly #tokens: ServerSessionTokens;
  readonly #dataStore: IServerSessionDataStore;

  constructor(sessionId: number) {
    this.#dataStore = serverSessionDataStoreFactory(sessionId);
    this.#tokens = new ServerSessionTokens(this.#dataStore);
  }

  get tokens() {
    return this.#tokens;
  }
  async resolveTokens() {
    return await this.#tokens.load();
  }
  async flush() {
    if (!this.#tokens.dirty) {
      return;
    }
    const result = await this.#tokens.save();
    if (!result) {
      log((l) =>
        l.warn({
          message:
            'Server sesion was not saved, token data may need to be re-aquired next query',
        })
      );
    }
  }
}

type ResolveReturnType<T extends undefined | string | (string | null)> =
  T extends undefined
    ? IResolvedServerSessionTokens
    : T extends 'refresh' | 'access'
    ? string
    : string | null;

export class ServerSessionTokens implements IServerSessionTokens {
  #gmail: string | null | undefined;
  #refresh: string | undefined;
  #access: string | undefined;
  #dataStore: IServerSessionDataStore;
  #dirty: boolean;
  constructor(dataStore: IServerSessionDataStore) {
    this.#dataStore = dataStore;
    this.#dirty = false;
  }

  get gmail() {
    return this.#resolve('gmail');
  }
  setGmail(value: string) {
    this.#gmail = value;
    this.#dirty = true;
  }
  get refresh() {
    return this.#resolve('refresh');
  }
  get access() {
    return this.#resolve('access');
  }
  get dirty() {
    return this.#dirty;
  }
  async #resolve<
    TFieldType extends undefined | keyof IResolvedServerSessionTokens
  >(field?: TFieldType): Promise<ResolveReturnType<TFieldType>> {
    const makeReturnType = (): ResolveReturnType<TFieldType> => {
      const ret = {
        gmail: this.#gmail,
        refresh: this.#refresh!,
        access: this.#access!,
      } as IResolvedServerSessionTokens;
      return (
        field === undefined ? ret : ret[field]
      ) as ResolveReturnType<TFieldType>;
    };
    if (this.#refresh !== undefined) {
      return makeReturnType();
    }
    return await this.#dataStore.load().then((record) => {
      if (record) {
        this.#dirty = false;
        this.#refresh = record.refresh;
        this.#gmail = record.gmail;
        this.#access = record.access;
      }
      return makeReturnType();
    });
  }
  async save() {
    if (!this.#dirty) {
      return false;
    }
    const record = {
      gmail: this.#gmail,
      refresh: this.#refresh,
      access: this.#access,
    };
    return await this.#dataStore.save(record);
  }
  async load(): Promise<IResolvedServerSessionTokens> {
    return await this.#resolve(undefined);
  }
}

export const serverSessionFactory = (
  session: Session,
  attach: boolean = true
): IServerSession => {
  const ret = new ServerSession(session.id);
  if (attach) {
    const target = session as Partial<SessionExt>;
    target.server = ret;
  }
  return ret;
};
