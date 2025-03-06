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
  SelectQueryNode,
  InsertQueryNode,
  UpdateQueryNode,
  DeleteQueryNode,
} from "kysely";
import * as SQLite from "expo-sqlite";
import { ExpoDialectConfig } from "./types/expo-dialect-config";
import { deserialize as autoAffinityDeserialize } from "./converters/auto-affinity-deserialize";
import { deserialize as nameBasedDeserialize } from "./converters/column-based-deserialize";
import { serialize } from "./converters/serialize";

/**
 * Expo dialect for Kysely.
 */
export class ExpoDialect implements Dialect {
  config: ExpoDialectConfig;

  constructor(config: ExpoDialectConfig) {
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
    await this.#connection.closeConnection();
  }

  async getDatabaseRuntimeVersion() {
    try {
      const res = await this.#connection.directQuery(
        "select sqlite_version() as version;",
      );
      //@ts-ignore
      return res[0].version;
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
    if (typeof config.database === "string") {
      this.sqlite = SQLite.openDatabaseSync(config.database);
    } else {
      this.sqlite = config.database;
    }

    this.debug = config.debug ?? false;
    this.config = config;

    if (this.config.disableForeignKeys) {
      this.sqlite.execSync("PRAGMA foreign_keys = OFF;");
    } else {
      this.sqlite.execSync("PRAGMA foreign_keys = ON;");
    }
  }

  async closeConnection(): Promise<void> {
    return this.sqlite.closeAsync();
  }

  async executeQuery<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
    let { sql, parameters, query } = compiledQuery;

    // Kysely uses varchar(255) as the default string type for migrations which is not supported by STRICT mode.
    if (
      query.kind === "CreateTableNode" &&
      !sql.includes("kysely_migration") &&
      !sql.includes("kysely_migration_lock") &&
      !sql.includes("STRICT") &&
      !this.config.disableStrictModeCreateTable
    ) {
      sql += " STRICT";
    }

    const readonly =
      query.kind === "SelectQueryNode" || query.kind === "RawNode";

    // Check if the query has a RETURNING clause
    const hasReturning = sql.toUpperCase().includes("RETURNING");

    const transformedParameters = serialize([...parameters]);

    if (this.debug) {
      console.debug(`${query.kind}${readonly ? " (readonly)" : ""}: ${sql}`);
      if (hasReturning) console.debug("Query has RETURNING clause");
    }

    if (readonly || hasReturning) {
      let res = await this.sqlite.getAllAsync<R>(sql, transformedParameters);

      const skip =
        query.kind === "SelectQueryNode" && sql.includes("pragma_table_info"); // @todo: fix this hack - find a better way

      if (this.config.columnNameBasedConversion && !skip) {
        if (this.debug) console.log("processing nameBasedDeserialize");

        return {
          rows: nameBasedDeserialize(
            res,
            this.config.columnNameBasedConversion,
          ),
          // Add these properties for non-readonly queries with RETURNING
          ...(hasReturning && !readonly
            ? {
                numUpdatedOrDeletedRows: BigInt(0), // We don't know this value
                numAffectedRows: BigInt(0), // We don't know this value
                insertId: BigInt(0), // We don't know this value
              }
            : {}),
        } satisfies QueryResult<R>;
      }

      if (this.config.autoAffinityConversion && !skip) {
        if (this.debug) console.log("processing autoAffinityDeserialize");

        return {
          rows: autoAffinityDeserialize(res, this.config.onError),
          // Add these properties for non-readonly queries with RETURNING
          ...(hasReturning && !readonly
            ? {
                numUpdatedOrDeletedRows: BigInt(0), // We don't know this value
                numAffectedRows: BigInt(0), // We don't know this value
                insertId: BigInt(0), // We don't know this value
              }
            : {}),
        } satisfies QueryResult<R>;
      }

      return {
        rows: res,
        // Add these properties for non-readonly queries with RETURNING
        ...(hasReturning && !readonly
          ? {
              numUpdatedOrDeletedRows: BigInt(0), // We don't know this value
              numAffectedRows: BigInt(0), // We don't know this value
              insertId: BigInt(0), // We don't know this value
            }
          : {}),
      } satisfies QueryResult<R>;
    } else {
      const res = await this.sqlite.runAsync(sql, transformedParameters);

      const queryResult = {
        numUpdatedOrDeletedRows: BigInt(res.changes),
        numAffectedRows: BigInt(res.changes),
        insertId: BigInt(res.lastInsertRowId),
        rows: [],
      } satisfies QueryResult<R>;

      if (this.debug) console.log("queryResult", queryResult);

      return queryResult;
    }
  }

  async directQuery<T>(query: string): Promise<Array<T>> {
    return await this.sqlite.getAllAsync<T>(query, []);
  }

  streamQuery<R>(
    compiledQuery: CompiledQuery,
    chunkSize?: number,
  ): AsyncIterableIterator<QueryResult<R>> {
    const { sql, parameters, query } = compiledQuery;

    throw new Error(
      "Expo SQLite driver does not support iterate on prepared statements",
    );
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
