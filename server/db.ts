import { desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertMediaCatalogItem,
  InsertUser,
  mediaCatalog,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function ensureMediaCatalogSchema() {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(
      sql.raw(`
        CREATE TABLE IF NOT EXISTS media_catalog (
          id int NOT NULL AUTO_INCREMENT,
          publicId varchar(80) NOT NULL,
          title varchar(255) NOT NULL,
          artist varchar(255) DEFAULT 'Mg Flâsh',
          kind enum('audio','video') NOT NULL,
          storageKey varchar(512) NOT NULL,
          storageProvider varchar(32) NOT NULL DEFAULT 'forge',
          telegramFileId varchar(256) NULL,
          telegramMessageId int NULL,
          thumbnailFileId varchar(256) NULL,
          mimeType varchar(160) NULL,
          fileSize bigint NULL,
          published int NOT NULL DEFAULT 1,
          sortOrder int NOT NULL DEFAULT 0,
          createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY media_catalog_public_id_unique (publicId),
          KEY media_catalog_published_idx (published),
          KEY media_catalog_sort_order_idx (sortOrder)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `),
    );
    console.log("[Database] media_catalog table is ready");
    await db.execute(
      sql.raw(
        "ALTER TABLE media_catalog ADD COLUMN thumbnailFileId varchar(256) NULL",
      ),
    );
    console.log("[Database] Added media_catalog.thumbnailFileId");
  } catch (error: any) {
    if (error?.errno !== 1060 && error?.code !== "ER_DUP_FIELDNAME") {
      console.warn(
        "[Database] Thumbnail compatibility check:",
        error?.message || error,
      );
    }
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function listPublishedMedia() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(mediaCatalog)
    .where(eq(mediaCatalog.published, 1))
    .orderBy(desc(mediaCatalog.sortOrder), desc(mediaCatalog.createdAt));
}

export async function listAllMedia() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(mediaCatalog)
    .orderBy(desc(mediaCatalog.sortOrder), desc(mediaCatalog.createdAt));
}

export async function createMediaCatalogItem(item: InsertMediaCatalogItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(mediaCatalog).values(item);
  return item.publicId;
}

export async function getMediaByPublicId(publicId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(mediaCatalog)
    .where(eq(mediaCatalog.publicId, publicId))
    .limit(1);
  return result[0];
}

export async function updateMediaCatalogItem(
  publicId: string,
  data: Partial<InsertMediaCatalogItem>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(mediaCatalog)
    .set(data)
    .where(eq(mediaCatalog.publicId, publicId));
}

export async function deleteMediaCatalogItem(publicId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(mediaCatalog).where(eq(mediaCatalog.publicId, publicId));
}
