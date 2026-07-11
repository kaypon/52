-- CreateTable
CREATE TABLE "deck_hashes" (
    "hash" TEXT NOT NULL,
    "deck_order" JSONB NOT NULL,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seen_count" INTEGER NOT NULL DEFAULT 1,
    "first_nickname" TEXT,

    CONSTRAINT "deck_hashes_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "deck_submissions" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nickname" TEXT,
    "action_count" INTEGER NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "actions" JSONB NOT NULL,

    CONSTRAINT "deck_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deck_submissions_hash_idx" ON "deck_submissions"("hash");

-- AddForeignKey
ALTER TABLE "deck_submissions" ADD CONSTRAINT "deck_submissions_hash_fkey" FOREIGN KEY ("hash") REFERENCES "deck_hashes"("hash") ON DELETE CASCADE ON UPDATE CASCADE;
