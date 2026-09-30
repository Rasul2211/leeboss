-- Settings the shop edits itself: the Telegram bot token and the chat that
-- should receive new orders. In the database rather than the environment, so
-- the owner can connect a bot from a phone without a redeploy.
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);
