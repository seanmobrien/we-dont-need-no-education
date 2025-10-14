/* eslint-disable @typescript-eslint/no-explicit-any */
import { ColumnList, ResultMeta } from 'postgres';

export type CommandMeta = ResultMeta<number>['command'];

export type IResultset<T extends readonly any[] = readonly any[]> = ReadonlyArray<any> & {
  readonly statement: string;
  readonly command: CommandMeta;
  readonly fields: ColumnList<keyof T>;
  readonly count: number;
  readonly rows: Array<T>;
};
