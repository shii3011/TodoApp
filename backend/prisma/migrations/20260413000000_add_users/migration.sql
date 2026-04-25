-- CreateTable
CREATE TABLE "users" (
    "id"        TEXT          NOT NULL,
    "email"     TEXT          NOT NULL,
    "name"      TEXT,
    "createdAt" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3)  NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey: todos.userId -> users.id (既存レコードは事前に users へ登録が必要)
ALTER TABLE "todos" ADD CONSTRAINT "todos_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
