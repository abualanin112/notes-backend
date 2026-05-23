-- AlterTable
ALTER TABLE "tokens" ADD COLUMN "family_id" TEXT,
ADD COLUMN "ip" VARCHAR(45),
ADD COLUMN "last_used_at" TIMESTAMP(3),
ADD COLUMN "user_agent" TEXT;

-- DropIndex
DROP INDEX IF EXISTS "tokens_token_key";
DROP INDEX IF EXISTS "tokens_token_idx";
DROP INDEX IF EXISTS "tokens_token_type_blacklisted_idx";

-- CreateIndex
CREATE INDEX "tokens_family_id_idx" ON "tokens"("family_id");
