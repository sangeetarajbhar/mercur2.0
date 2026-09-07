import { MedusaContainer } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { logger } from "@medusajs/framework/logger";
import SSHClient from "ssh2-sftp-client";
// import { createHash } from "crypto";

import generateProductVariantInventoryFeedWorkflow from "../workflows/product-feed/workflows/generate-product-variant-inventory-fields-workflow";
import { uploadToS3WithPath } from "../shared/utils/common";
import { sendSlackNotification } from "../shared/utils/slack-helpers";

const LOOP_DEFAULT = 0;//0 to fetch all
const PAGE_SIZE_DEFAULT = 50;

// Replace with real SFTP credentials/paths (or set env vars).
const SFTP_HOST = process.env.SFTP_HOST || "";
const SFTP_PORT = Number(process.env.SFTP_PORT || 2222);
const SFTP_USER = process.env.SFTP_USER || "";
const SFTP_PASSWORD = process.env.SFTP_PASSWORD || "";
// Optional: SHA256/MD5 host key fingerprint (hex). If provided, we verify the server host key.
const SFTP_HOST_FINGERPRINT = process.env.SFTP_HOST_FINGERPRINT || "";
const SFTP_HOST_HASH_ALGO = process.env.SFTP_HOST_HASH_ALGO || "sha256";
// "." uploads to the user's home; change if you have a specific directory.
const SFTP_REMOTE_DIR = process.env.SFTP_REMOTE_DIR || ".";

export default async function runInventoryFeedSftpJob(container: MedusaContainer) {
  // Check if cron jobs are enabled via environment variable
  const cronEnabled = process.env.CRON_ENABLED_PRODUCT_FEEDS_REGIONAL === "1" || process.env.CRON_ENABLED_PRODUCT_FEEDS_REGIONAL === "true" || process.env.CRON_ENABLED_PRODUCT_FEEDS_REGIONAL === "TRUE"
  if (!cronEnabled) {
    return
  }

  logger.info("[inventory-feed-sftp] Starting job execution")
  const { result } = await generateProductVariantInventoryFeedWorkflow(container).run({})

  // Read CSV file from filePath
  const { readFile } = await import("fs/promises")
  const csv = await readFile(result.filePath, "utf-8")
  
  if (!csv) {
    logger.error("[inventory-feed-sftp] No CSV data found");
    return;
  }
  const key = `feeds/zilo_product_feeds_regional-${Date.now()}.csv`;
  const fileName = "zilo_product_feeds_regional.csv";

  // const hash = createHash("sha256").update(csv).digest("hex");
  // const md5 = createHash("md5").update(csv).digest("hex");

  // logger.info(`[inventory-feed-sftp] Hash: ${hash}`);
  // logger.info(`[inventory-feed-sftp] MD5: ${md5}`);

  // Upload to S3
  const s3Url = await uploadToS3WithPath(
    key,
    Buffer.from(csv, "utf-8"),
    "text/csv; charset=utf-8"
  );

  // Clean up temporary file
  const { unlink } = await import("fs/promises")
  await unlink(result.filePath).catch(() => {}) // Ignore errors if file already deleted
  logger.info(`[inventory-feed-sftp] Uploaded to S3: ${s3Url}`);

  // Notify admin (feed channel) with S3 URL
  try {
    const notificationService = container.resolve(Modules.NOTIFICATION);
    const notifyUser = process.env.FEED_NOTIFY_USER_ID || "admin";
    await notificationService.createNotifications({
      to: notifyUser,
      channel: "feed",
      template: "admin-ui",
      data: {
        title: "Zilo Product Feeds Regional ready",
        description: `Uploaded to S3`,
        file: {
          url: s3Url,
          filename: key,
          mimeType: "text/csv",
        },
        export_type: "zilo_product_feeds_regional",
      },
    });
    // logger.info(`[inventory-feed-sftp] Notified ${notifyUser} with S3 URL`);
  } catch (e: any) {
    logger.error(`[inventory-feed-sftp] Notification failed: ${e?.message || e}`);
  }
  // SFTP upload (optional; skip if creds are missing)
  if (!SFTP_HOST || !SFTP_USER || !SFTP_PASSWORD) {
    logger.warn("[inventory-feed-sftp] Skipping SFTP upload: missing host/user/password");
    return;
  }

  const sftp = new SSHClient();
  try {
    await sftp.connect({
      host: SFTP_HOST,
      port: SFTP_PORT,
      username: SFTP_USER,
      password: SFTP_PASSWORD,
      ...(SFTP_HOST_FINGERPRINT
        ? {
            hostHash: SFTP_HOST_HASH_ALGO,
            hostVerifier: (hashedKey: string) => {
              const match = hashedKey === SFTP_HOST_FINGERPRINT;
              if (!match) {
                logger.error(
                  `[inventory-feed-sftp] Host key verification failed. Expected ${SFTP_HOST_FINGERPRINT}, got ${hashedKey}`
                );
              }
              return match;
            },
          }
        : {}),
    })

    const remotePath = `${SFTP_REMOTE_DIR}/${fileName}`
    const csvBuffer = Buffer.from(csv, "utf-8")
    const expectedSize = Buffer.byteLength(csv, "utf-8")
    const maxRetries = 3
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await sftp.put(csvBuffer, remotePath)
        const stat = await sftp.stat(remotePath)
        if (stat.size !== expectedSize) {
          logger.warn(`[inventory-feed-sftp] Size mismatch: expected ${expectedSize}, got ${stat.size}`)
        }
        logger.info(`[inventory-feed-sftp] SFTP uploaded and verified: ${remotePath}`)
        await sendSlackNotification(
          `[inventory-feed-sftp] SFTP upload succeeded. Remote path: ${remotePath}`
        )
        break
      } catch (e: any) {
        if (attempt === maxRetries) throw e
        logger.warn(`[inventory-feed-sftp] Attempt ${attempt} failed, retrying...`)
        await new Promise((r) => setTimeout(r, 2000 * attempt))
      }
    }
  } catch (e: any) {
    logger.error(`[inventory-feed-sftp] SFTP upload failed: ${e?.message || e}`);
    await sendSlackNotification(
      `[inventory-feed-sftp] SFTP upload failed: ${e?.message || e}`
    )
  } finally {
    await sftp.end()
  }
}

// Run every 10 seconds. If your cron parser supports seconds, use */10.
export const config = {
  name: "run-inventory-feed-sftp",
  // Every 8 hours
  // schedule: process.env.CRON_INVENTORY_FEED_SFTP || "0 6-23/8 * * *",
  schedule: "0 6-23/8 * * *",
  // schedule: "*/60 * * * * *",
}
