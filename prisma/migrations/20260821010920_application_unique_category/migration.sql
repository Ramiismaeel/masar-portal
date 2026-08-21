/*
  Warnings:

  - A unique constraint covering the columns `[userId,category]` on the table `applications` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "applications_userId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "applications_userId_category_key" ON "applications"("userId", "category");
