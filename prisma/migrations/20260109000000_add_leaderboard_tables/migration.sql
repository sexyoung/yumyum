-- 排行榜功能：修改 players 表並新增 game_records 表

-- 1. 為 players 表新增排行榜相關欄位（uuid 先設為可 null）
ALTER TABLE "players" ADD COLUMN "uuid" UUID;
ALTER TABLE "players" ADD COLUMN "games_lost" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "players" ADD COLUMN "current_streak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "players" ADD COLUMN "max_win_streak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "players" ADD COLUMN "last_played_at" TIMESTAMP(3);
ALTER TABLE "players" ADD COLUMN "username_changed_at" TIMESTAMP(3);

-- 2. 為現有玩家生成 UUID
UPDATE "players" SET "uuid" = gen_random_uuid() WHERE "uuid" IS NULL;

-- 3. 將 uuid 設為 NOT NULL
ALTER TABLE "players" ALTER COLUMN "uuid" SET NOT NULL;

-- 4. 移除 username 的 unique 索引（允許重複暱稱）
DROP INDEX IF EXISTS "players_username_key";

-- 5. 新增 uuid 索引
CREATE UNIQUE INDEX "players_uuid_key" ON "players"("uuid");
CREATE INDEX "idx_players_uuid" ON "players"("uuid");
CREATE INDEX "idx_players_streak" ON "players"("max_win_streak" DESC);

-- 6. 創建對局記錄表
CREATE TABLE "game_records" (
    "id" SERIAL NOT NULL,
    "room_id" VARCHAR(10) NOT NULL,
    "red_player_id" INTEGER NOT NULL,
    "blue_player_id" INTEGER NOT NULL,
    "winner_id" INTEGER,
    "winner_color" VARCHAR(10),
    "red_elo_change" INTEGER NOT NULL,
    "blue_elo_change" INTEGER NOT NULL,
    "red_elo_before" INTEGER NOT NULL,
    "blue_elo_before" INTEGER NOT NULL,
    "total_moves" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_records_pkey" PRIMARY KEY ("id")
);

-- 7. 新增 game_records 索引
CREATE INDEX "idx_games_created" ON "game_records"("created_at" DESC);
CREATE INDEX "idx_games_red" ON "game_records"("red_player_id");
CREATE INDEX "idx_games_blue" ON "game_records"("blue_player_id");

-- 8. 新增外鍵約束
ALTER TABLE "game_records" ADD CONSTRAINT "game_records_red_player_id_fkey" FOREIGN KEY ("red_player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "game_records" ADD CONSTRAINT "game_records_blue_player_id_fkey" FOREIGN KEY ("blue_player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
