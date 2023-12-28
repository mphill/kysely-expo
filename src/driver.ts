import {
  Kysely,
  DatabaseIntrospector,
  DialectAdapter,
  Driver,
  QueryCompiler,
  DatabaseConnection,
  SqliteIntrospector,
  SqliteQueryCompiler,
  SqliteAdapter,
  QueryResult,
  Dialect,
  CompiledQuery,
} from "kysely";
import * as SQLite from "expo-sqlite";

export type ExpoDialectConfig = {
  database: string;
  disableForeignKeys?: boolean;
  disableNameBasedCasts?: boolean;
  debug?: boolean;
  // “SQLite stores JSON as ordinary text. Backwards compatibility constraints mean that SQLite is only able to store values that are NULL, integers, floating-point numbers, text, and BLOBs. It is not possible to add a sixth “JSON” type.”
  typeConverters?: {
    boolean?: (columnName: string) => boolean;
    date?: (columnName: string) => boolean;
    json?: (columnName: string) => boolean;
  };
};

/**
 * Expo dialect for Kysely.
 */
export class ExpoDialect implements Dialect {
  config: ExpoDialectConfig;

  constructor(config: ExpoDialectConfig) {
    if (!config.typeConverters && !config.disableNameBasedCasts) {
      config.typeConverters = {
        boolean: (columnName) =>
          columnName.startsWith("is_") ||
          columnName.startsWith("has_") ||
          columnName.endsWith("_flag"),
        date: (columnName) => columnName.endsWith("_at"),
      };
    }

    this.config = config;
  }

  createDriver(): ExpoDriver {
    return new ExpoDriver(this.config);
  }
  createQueryCompiler(): QueryCompiler {
    return new SqliteQueryCompiler();
  }
  createAdapter(): DialectAdapter {
    return new SqliteAdapter();
  }
  // rome-ignore lint/suspicious/noExplicitAny: <explanation>
  createIntrospector(db: Kysely<any>): DatabaseIntrospector {
    return new SqliteIntrospector(db);
  }
}

/**
 * Expo driver for Kysely.
 */
export class ExpoDriver implements Driver {
  readonly #connectionMutex = new ConnectionMutex();
  readonly #connection: ExpoConnection;

  constructor(config: ExpoDialectConfig) {
    this.#connection = new ExpoConnection(config);
  }

  async releaseConnection(): Promise<void> {
    this.#connectionMutex.unlock();
  }

  async init(): Promise<void> {}

  async acquireConnection(): Promise<ExpoConnection> {
    await this.#connectionMutex.lock();
    return this.#connection;
  }

  async beginTransaction(connection: ExpoConnection): Promise<void> {
    await connection.directQuery("begin transaction");
  }

  async commitTransaction(connection: ExpoConnection): Promise<void> {
    await connection.directQuery("commit");
  }

  async rollbackTransaction(connection: ExpoConnection): Promise<void> {
    await connection.directQuery("rollback");
  }

  async destroy(): Promise<void> {
    this.#connection.closeConnection();
  }

  async getDatabaseRuntimeVersion() {
    try {
      const res = await this.#connection.directQuery(
        "select sqlite_version() as version;",
      );

      return res[0].rows[0].version;
    } catch (e) {
      console.error(e);
      return "unknown";
    }
  }
}

/**
 * Expo connection for Kysely.
 */
class ExpoConnection implements DatabaseConnection {
  sqlite: SQLite.SQLiteDatabase;
  debug: boolean;
  config: ExpoDialectConfig;

  constructor(config: ExpoDialectConfig) {
    this.sqlite = SQLite.openDatabase(config.database);
    this.debug = config.debug ?? false;

    if (!config.disableForeignKeys) {
      this.directQuery("PRAGMA foreign_keys = ON;");
    }

    this.config = config;
  }

  async closeConnection(): Promise<void> {
    return this.sqlite.closeAsync();
  }

  async executeQuery<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
    const { sql, parameters } = compiledQuery;

    const readonly =
      compiledQuery.query.kind === "SelectQueryNode" ||
      compiledQuery.query.kind === "RawNode";

    // Convert all Date objects to strings
    const transformedParameters = parameters.map((parameter) => {
      if (parameter instanceof Date) {
        return parameter.toISOString();
      }
      return parameter;
    });

    if (this.debug) {
      console.debug(`query: ${sql}`);
    }

    const result = new Promise<QueryResult<R>>((resolve, reject) => {
      this.sqlite.transaction((tx) => {
        tx.executeSql(
          sql,
          transformedParameters as number[] | string[],
          (tx, res) => {
            if (readonly) {
              // @todo optimize this loop.  Sample 1 row and determine the index of the boolean/date columns.  Then use that index to convert the values in the loop below.

              const rows = res.rows._array.map((row) => {
                for (const key in row) {
                  // Check if the row is a boolean
                  if (this.config.typeConverters?.boolean?.(key)) {
                    row[key] = Boolean(row[key]);
                  }

                  // Check if the row is a date
                  if (this.config.typeConverters?.date?.(key)) {
                    row[key] = new Date(row[key]);
                  }
                }
                return row;
              });

              resolve({
                rows: rows as unknown as R[],
              });
            } else {
              const result: QueryResult<R> = {
                numUpdatedOrDeletedRows: BigInt(res.rowsAffected),
                numAffectedRows: BigInt(res.rowsAffected),
                insertId: res.insertId ? BigInt(res.insertId) : undefined,
                rows: [],
              };

              resolve(result);
            }
          },
          (tx, err) => {
            reject(err);
            return false;
          },
        );
      });
    });

    return result as Promise<QueryResult<R>>;
  }

  async directQuery(query: string): Promise<SQLite.ResultSet[]> {
    const sqliteQuery = new Promise<SQLite.ResultSet[]>((resolve, reject) => {
      this.sqlite.exec([{ sql: query, args: [] }], false, (err, res) => {
        if (err || !res) {
          return reject(err);
        }

        // @ts-ignore
        if (res[0]?.error) {
          return reject(res as unknown as SQLite.ResultSetError[]);
        }

        resolve(res as unknown as SQLite.ResultSet[]);
      });
    });

    return sqliteQuery;
  }

  streamQuery<R>(
    compiledQuery: CompiledQuery,
    chunkSize?: number,
  ): AsyncIterableIterator<QueryResult<R>> {
    throw new Error("Sqlite driver doesn't support streaming");
  }
}

class ConnectionMutex {
  #promise?: Promise<void>;
  #resolve?: () => void;

  async lock(): Promise<void> {
    while (this.#promise) {
      await this.#promise;
    }

    this.#promise = new Promise((resolve) => {
      this.#resolve = resolve;
    });
  }

  unlock(): void {
    const resolve = this.#resolve;

    this.#promise = undefined;
    this.#resolve = undefined;

    resolve?.();
  }
}
