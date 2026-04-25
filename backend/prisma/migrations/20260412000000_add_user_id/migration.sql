-- AlterTable: userId カラムを追加（既存レコードは空文字列で初期化）
ALTER TABLE "todos" ADD COLUMN "userId" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "todos_userId_idx" ON "todos"("userId");
