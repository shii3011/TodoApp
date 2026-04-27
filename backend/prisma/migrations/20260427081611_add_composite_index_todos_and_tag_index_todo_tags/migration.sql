-- DropIndex: 単一インデックスを複合インデックスに差し替え
DROP INDEX "todos_userId_idx";

-- CreateIndex: todos(userId, parentId) 複合インデックス
-- listTodos の WHERE userId = ? AND parentId IS NULL と
-- サブタスク取得の WHERE parentId = ? を両方カバー
CREATE INDEX "todos_userId_parent_id_idx" ON "todos"("userId", "parent_id");

-- CreateIndex: todo_tags(tagId) インデックス
-- タグ削除時カスケードの WHERE tagId = ? をカバー
CREATE INDEX "todo_tags_tagId_idx" ON "todo_tags"("tagId");
