import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { randomUUID } from "crypto"
import { productScoreNormalizer } from "../../../../modules/search/product-score-normalizer"
import { syncYesPlzScoresBackgroundWorkflow } from "../../../../workflows/search/workflows/sync-yesplz-scores-background"

export const GET = async (
  _req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  res.status(200).json({
    message: "YesPlz Product Scores API",
    instructions: {
      upload_endpoint: "/admin/yesplz/product-scores",
      method: "POST",
      content_type: "multipart/form-data",
      required_columns: ["product_id", "final_score"],
      notes: [
        "Uses product.patched webhook (PATCH) — sends only productId + final_score",
        "Falls back to full product.updated webhook for any PATCH failures",
        "Accepts .xlsx, .xls, and .csv file formats",
        "Processes in background; you will be notified in the feed when complete",
        "product_id must match pattern: prod_<alphanumeric>",
      ],
    },
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  try {
    const reqWithFile = req as AuthenticatedMedusaRequest & {
      file?: { buffer: Buffer; originalname?: string }
      files?: { file?: Array<{ buffer: Buffer; originalname?: string }> }
    }
    const file = reqWithFile.file ?? reqWithFile.files?.file?.[0]

    if (!file?.buffer) {
      return res.status(400).json({
        message:
          "No file uploaded. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.",
      })
    }

    const { scoreMap, parseErrors } = productScoreNormalizer.parse(
      file.buffer,
      file.originalname ?? ""
    )

    if (scoreMap.size === 0) {
      return res.status(400).json({
        message: "No valid product scores found in file.",
        parse_errors: parseErrors,
      })
    }

    const user_id =
      req.auth_context?.actor_id || process.env.FEED_NOTIFY_USER_ID || "admin"
    const transaction_id = randomUUID()

    const score_map = Object.fromEntries(scoreMap)

    const { result } = await syncYesPlzScoresBackgroundWorkflow.run({
      container: req.scope,
      input: {
        user_id,
        transaction_id,
        score_map,
        parse_errors: parseErrors.length > 0 ? parseErrors : undefined,
        channel: "feed",
      },
    })

    return res.status(202).json({
      transaction_id: result.transaction_id ?? transaction_id,
      status: result.status ?? "processing",
      message:
        result.message ??
        "Product scores upload started in background. You will be notified when it completes.",
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    res.status(500).json({
      message: "Failed to start product scores sync",
      error: message,
    })
  }
}

