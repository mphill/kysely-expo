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
};

/**
 * Expo dialect for Kysely.
 */
export class ExpoDialect implements Dialect {
	config: ExpoDialectConfig;

	constructor(config: ExpoDialectConfig) {
		this.config = config;
	}

	createDriver(): Driver {
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

	beginTransaction(connection: DatabaseConnection): Promise<void> {
		throw new Error("Transactions are not supported.");
	}

	async releaseConnection(): Promise<void> {
		this.#connectionMutex.unlock();
	}

	async init(): Promise<void> {}
	async acquireConnection(): Promise<DatabaseConnection> {
		await this.#connectionMutex.lock();
		return this.#connection;
	}

	commitTransaction(connection: ExpoConnection): Promise<void> {
		throw new Error("All queries are automatically commited with success.");
	}
	rollbackTransaction(connection: ExpoConnection): Promise<void> {
		throw new Error("Rollback is not supported.");
	}

	async destroy(): Promise<void> {
		this.#connection.closeConnecton();
	}
}

/**
 * Expo connection for Kysely.
 */
class ExpoConnection implements DatabaseConnection {
	sqlite: SQLite.WebSQLDatabase;

	constructor(config: ExpoDialectConfig) {
		this.sqlite = SQLite.openDatabase(config.database);
	}

	async closeConnecton(): Promise<void> {
		return this.sqlite.closeAsync();
	}

	async executeQuery<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
		const { sql, parameters } = compiledQuery;

		const readonly = compiledQuery.query.kind === "SelectQueryNode";

		const result = new Promise<QueryResult<R>>((resolve, reject) => {
			this.sqlite.transaction((tx) => {
				tx.executeSql(
					sql,
					parameters as number[] | string[],
					(tx, res) => {
						if (readonly) {
							resolve({
								rows: res.rows._array as unknown as R[],
							});
						} else {
							const result: QueryResult<R> = {
								numUpdatedOrDeletedRows: BigInt(res.rowsAffected),
								numAffectedRows: BigInt(res.rowsAffected),
								// rome-ignore lint/suspicious/noExplicitAny: <explanation>
								insertId: res.insertId as any,
								rows: [],
							};

							resolve(result);
						}
					},
					(tx, err) => {
						reject(err);
					},
				);
			});
		});

		return result as Promise<QueryResult<R>>;
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
