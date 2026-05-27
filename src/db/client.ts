import { drizzle } from "drizzle-orm/expo-sqlite";
import type { ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import type { SQLiteDatabase } from "expo-sqlite";
import { Platform } from "react-native";

import { schema } from "@/db/schema";

let sqlite: SQLiteDatabase | null = null;
let drizzleDb: (ExpoSQLiteDatabase<typeof schema> & { $client: SQLiteDatabase }) | null = null;

export function isSQLiteAvailable() {
  return Platform.OS !== "web";
}

export function getSqlite() {
  if (!isSQLiteAvailable()) {
    throw new Error("SQLite is available in Expo Go/native builds. Web preview uses empty local data.");
  }

  sqlite ??= openDatabaseSync("lumira.db");
  return sqlite;
}

export function getDb() {
  drizzleDb ??= drizzle(getSqlite(), { schema });
  return drizzleDb;
}
