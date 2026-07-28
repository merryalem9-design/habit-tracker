/*
  Warnings:

  - A unique constraint covering the columns `[user_id,category]` on the table `PairQueue` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PairQueue_user_id_category_key" ON "PairQueue"("user_id", "category");
