import { MedusaContainer } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { logger } from "@medusajs/framework/logger";
import SSHClient from "ssh2-sftp-client";
import { format } from "date-fns";
// import { createHash } from "crypto";

import generateProductVariantFeedWorkflow from "../workflows/product-feed/workflows/generate-product-variant-fields-workflow";
import { uploadToS3WithPath } from "../shared/utils/common";
import { sendSlackNotification } from "../shared/utils/slack-helpers";
import { transformGoogleFeedToMetaFeed } from "../workflows/product-feed/steps/shared/feed-transformer";

const LOOP_DEFAULT = 0; // 0 to fetch all
const PAGE_SIZE_DEFAULT = 100;

// Replace with real SFTP credentials/paths (or set env vars).
// Google SFTP credentials
const SFTP_HOST = process.env.SFTP_HOST || "";
const SFTP_PORT = Number(process.env.SFTP_PORT || 2222);
const SFTP_USER = process.env.SFTP_USER || "";
const SFTP_PASSWORD = process.env.SFTP_PASSWORD || "";
// Optional: SHA256/MD5 host key fingerprint (hex). If provided, we verify the server host key.
const SFTP_HOST_FINGERPRINT = process.env.SFTP_HOST_FINGERPRINT || "";
const SFTP_HOST_HASH_ALGO = process.env.SFTP_HOST_HASH_ALGO || "sha256";
// "." uploads to the user's home; change if you have a specific directory.
const SFTP_REMOTE_DIR = process.env.SFTP_REMOTE_DIR || ".";
const SFTP_FILE_NAME = process.env.SFTP_FILE_NAME || "zilo_product_feeds";

// Meta SFTP credentials (different server)
const SFTP_HOST_META = process.env.SFTP_HOST_META || "";
const SFTP_PORT_META = Number(process.env.SFTP_PORT_META || 2222);
const SFTP_USER_META = process.env.SFTP_USER_META || "";
const SFTP_PASSWORD_META = process.env.SFTP_PASSWORD_META || "";
// Optional: SHA256/MD5 host key fingerprint (hex). If provided, we verify the server host key.
const SFTP_HOST_FINGERPRINT_META = process.env.SFTP_HOST_FINGERPRINT_META || "";
const SFTP_HOST_HASH_ALGO_META = process.env.SFTP_HOST_HASH_ALGO_META || "sha256";
// "." uploads to the user's home; change if you have a specific directory.
const SFTP_REMOTE_DIR_META = process.env.SFTP_REMOTE_DIR_META || ".";
const SFTP_FILE_NAME_META = process.env.SFTP_FILE_NAME_META || "zilo_product_feeds_meta";

export default async function runProductVariantFeedSftpJob(container: MedusaContainer) {
  // Check if cron jobs are enabled via environment variable
  const cronEnabled = process.env.CRON_ENABLED_PRODUCT_FEEDS === "1" || process.env.CRON_ENABLED_PRODUCT_FEEDS === "true" || process.env.CRON_ENABLED_PRODUCT_FEEDS === "TRUE"
  if (!cronEnabled) {
    return
  }

  logger.info("[product-variant-feed-sftp] Starting job execution")
  const { result } = await generateProductVariantFeedWorkflow(container).run({})

  // Read CSV file from filePath
  const { readFile } = await import("fs/promises")
  const googleFeedCsv = await readFile(result.filePath, "utf-8")
  
  if (!googleFeedCsv) {
    logger.error("[product-variant-feed-sftp] No CSV data found");
    return;
  }

  // Generate human-readable timestamp in IST (server timezone) with seconds precision
  const timestamp = format(new Date(), "yyyy-MM-dd");
  
  // Upload Google feed (with id and sku columns)
  // Remove .csv extension from base filename to avoid duplication
  const googleFeedKey = `feeds/${SFTP_FILE_NAME}-${timestamp}.csv`;
  const googleFeedFileName = `${SFTP_FILE_NAME}.csv`;
  const googleFeedS3Url = await uploadToS3WithPath(
    googleFeedKey,
    Buffer.from(googleFeedCsv, "utf-8"),
    "text/csv; charset=utf-8"
  );

  // Transform Google feed to Meta feed (remove id, rename sku to id)
  const metaFeedCsv = transformGoogleFeedToMetaFeed(googleFeedCsv);
  // Remove .csv extension from base filename to avoid duplication

  const metaFeedKey = `feeds/${SFTP_FILE_NAME_META}-${timestamp}.csv`;
  const metaFeedFileName = `${SFTP_FILE_NAME_META}.csv`;
  const metaFeedS3Url = await uploadToS3WithPath(
    metaFeedKey,
    Buffer.from(metaFeedCsv, "utf-8"),
    "text/csv; charset=utf-8"
  );

  // logger.info(`[product-variant-feed-sftp] Uploaded Google feed: ${googleFeedS3Url}`);
  // logger.info(`[product-variant-feed-sftp] Uploaded Meta feed: ${metaFeedS3Url}`);

  // Clean up temporary file
  const { unlink } = await import("fs/promises")
  await unlink(result.filePath).catch(() => {}) // Ignore errors if file already deleted
  logger.info(`[product-variant-feed-sftp] Uploaded to S3: ${googleFeedS3Url} and ${metaFeedS3Url}`);

  // Notify admin (feed channel) with S3 URLs for both feeds
  try {
    const notificationService = container.resolve(Modules.NOTIFICATION);
    const notifyUser = process.env.FEED_NOTIFY_USER_ID || "admin";
    
    // Notify for Google feed
    await notificationService.createNotifications({
      to: notifyUser,
      channel: "feed",
      template: "admin-ui",
      data: {
        title: "Zilo Product Feeds (Google) ready",
        description: `Google feed uploaded to S3`,
        file: {
          url: googleFeedS3Url,
          filename: googleFeedKey,
          mimeType: "text/csv",
        },
        export_type: "zilo_product_feeds",
      },
    });

    // Notify for Meta feed
    await notificationService.createNotifications({
      to: notifyUser,
      channel: "feed",
      template: "admin-ui",
      data: {
        title: "Zilo Product Feeds (Meta) ready",
        description: `Meta feed uploaded to S3`,
        file: {
          url: metaFeedS3Url,
          filename: metaFeedKey,
          mimeType: "text/csv",
        },
        export_type: "zilo_product_feeds_meta",
      },
    });
    // logger.info(`[product-variant-feed-sftp] Notified ${notifyUser} with S3 URLs`);
  } catch (e: any) {
    logger.error(`[product-variant-feed-sftp] Notification failed: ${e?.message || e}`);
  }
  // SFTP upload for Google feed (optional; skip if creds are missing)
  if (SFTP_HOST && SFTP_USER && SFTP_PASSWORD) {
    const googleSftp = new SSHClient();
    try {
      await googleSftp.connect({
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
                    `[product-variant-feed-sftp] Google SFTP host key verification failed. Expected ${SFTP_HOST_FINGERPRINT}, got ${hashedKey}`
                );
              }
              return match;
            },
          }
        : {}),
    })

    // Upload Google feed to SFTP
    const googleFeedRemotePath = `${SFTP_REMOTE_DIR}/${googleFeedFileName}`
    const googleFeedBuffer = Buffer.from(googleFeedCsv, "utf-8")
    const expectedSize = Buffer.byteLength(googleFeedCsv, "utf-8")
    const maxRetries = 3
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await googleSftp.put(googleFeedBuffer, googleFeedRemotePath)
        const stat = await googleSftp.stat(googleFeedRemotePath)
        if (stat.size !== expectedSize) {
          logger.warn(`[product-variant-feed-sftp] Google feed size mismatch: expected ${expectedSize}, got ${stat.size}`)
        }
        logger.info(`[product-variant-feed-sftp] Google feed SFTP uploaded and verified: ${googleFeedRemotePath}`)
        await sendSlackNotification(
          `[product-variant-feed-sftp] Google feed SFTP upload succeeded. Remote path: ${googleFeedRemotePath}`
        )
        break
      } catch (e: any) {
        if (attempt === maxRetries) throw e
        logger.warn(`[product-variant-feed-sftp] Attempt ${attempt} failed, retrying...`)
        await new Promise((r) => setTimeout(r, 2000 * attempt))
      }
    }
  } catch (e: any) {
    logger.error(`[product-variant-feed-sftp] Google SFTP upload failed: ${e?.message || e}`)
    await sendSlackNotification(
      `[product-variant-feed-sftp] Google feed SFTP upload failed: ${e?.message || e}`
    )
    } finally {
      await googleSftp.end()
    }
  } else {
    logger.warn("[product-variant-feed-sftp] Skipping Google SFTP upload: missing host/user/password");
  }

  // SFTP upload for Meta feed (optional; skip if creds are missing)
  // if (SFTP_HOST_META && SFTP_USER_META && SFTP_PASSWORD_META) {
  //   const metaSftp = new SSHClient();
  //   try {
  //     await metaSftp.connect({
  //       host: SFTP_HOST_META,
  //       port: SFTP_PORT_META,
  //       username: SFTP_USER_META,
  //       password: SFTP_PASSWORD_META,
  //       ...(SFTP_HOST_FINGERPRINT_META
  //         ? {
  //             hostHash: SFTP_HOST_HASH_ALGO_META,
  //             hostVerifier: (hashedKey: string) => {
  //               const match = hashedKey === SFTP_HOST_FINGERPRINT_META;
  //               if (!match) {
  //                 logger.error(
  //                   `[product-variant-feed-sftp] Meta SFTP host key verification failed. Expected ${SFTP_HOST_FINGERPRINT_META}, got ${hashedKey}`
  //                 );
  //               }
  //               return match;
  //             },
  //           }
  //         : {}),
  //     })

  //     // Upload Meta feed to SFTP
  //     const metaFeedRemotePath = `${SFTP_REMOTE_DIR_META}/${metaFeedFileName}`
  //     await metaSftp.put(Buffer.from(metaFeedCsv, "utf-8"), metaFeedRemotePath)
  //     logger.info(`[product-variant-feed-sftp] Meta feed uploaded to SFTP: ${metaFeedRemotePath}`)
  // } catch (e: any) {
  //     logger.error(`[product-variant-feed-sftp] Meta SFTP upload failed: ${e?.message || e}`);
  // } finally {
  //     await metaSftp.end()
  //   }
  // } else {
  //   logger.warn("[product-variant-feed-sftp] Skipping Meta SFTP upload: missing host/user/password");
  // }
}

// Run every day at 4:00 AM
export const config = {
  name: "run-product-variant-feed-sftp",
  // Run every day at 4:00 AM
  schedule: "0 4 * * *",
  // schedule: "*/60 * * * * *",
}
