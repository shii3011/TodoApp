-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('low', 'medium', 'high');

-- CreateTable
CREATE TABLE "todos" (
    "id"          VARCHAR(191)  NOT NULL,
    "title"       VARCHAR(191)  NOT NULL,
    "description" VARCHAR(1000) NOT NULL DEFAULT '',
    "completed"   BOOLEAN       NOT NULL DEFAULT false,
    "priority"    "Priority"    NOT NULL DEFAULT 'medium',
    "createdAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3)  NOT NULL,

    CONSTRAINT "todos_pkey" PRIMARY KEY ("id")
);
