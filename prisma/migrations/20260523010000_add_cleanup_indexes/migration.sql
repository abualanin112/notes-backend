-- CreateIndex
CREATE INDEX "tokens_expires_idx" ON "tokens"("expires");

-- CreateIndex
CREATE INDEX "tokens_blacklisted_idx" ON "tokens"("blacklisted");
