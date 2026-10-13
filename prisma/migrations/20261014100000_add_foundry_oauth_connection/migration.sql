-- Store each local Ontix user's Foundry OAuth connection separately from
-- Better Auth accounts. Token values are application-encrypted before insert.
CREATE TABLE "foundry_connections" (
    "id" TEXT NOT NULL,
    "authUserId" TEXT NOT NULL,
    "encryptedAccessToken" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL DEFAULT '',
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSuccessfulRequestAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "foundry_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "foundry_connections_authUserId_key"
    ON "foundry_connections"("authUserId");
CREATE INDEX "foundry_connections_accessTokenExpiresAt_revokedAt_idx"
    ON "foundry_connections"("accessTokenExpiresAt", "revokedAt");

ALTER TABLE "foundry_connections"
    ADD CONSTRAINT "foundry_connections_authUserId_fkey"
    FOREIGN KEY ("authUserId") REFERENCES "auth_users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
