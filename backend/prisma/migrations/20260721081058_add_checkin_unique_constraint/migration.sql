/*
  Warnings:

  - A unique constraint covering the columns `[habit_id,date]` on the table `check_ins` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "check_ins_habit_id_date_key" ON "check_ins"("habit_id", "date");
