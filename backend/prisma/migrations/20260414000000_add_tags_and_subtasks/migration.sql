-- AlterTable: Add parentId to todos
ALTER TABLE "todos" ADD COLUMN "parent_id" TEXT;

-- CreateTable: tags
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#38a8f5',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable: todo_tags
CREATE TABLE "todo_tags" (
    "todoId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "todo_tags_pkey" PRIMARY KEY ("todoId","tagId")
);

-- CreateIndex
CREATE UNIQUE INDEX "tags_userId_name_key" ON "tags"("userId", "name");

-- AddForeignKey: todos.parent_id -> todos.id
ALTER TABLE "todos" ADD CONSTRAINT "todos_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "todos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: tags.userId -> users.id
ALTER TABLE "tags" ADD CONSTRAINT "tags_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: todo_tags.todoId -> todos.id
ALTER TABLE "todo_tags" ADD CONSTRAINT "todo_tags_todoId_fkey"
    FOREIGN KEY ("todoId") REFERENCES "todos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: todo_tags.tagId -> tags.id
ALTER TABLE "todo_tags" ADD CONSTRAINT "todo_tags_tagId_fkey"
    FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
