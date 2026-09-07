/**
 * CSV File Stream Manager
 * Manages initialization and finalization of CSV file streams
 */

import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { createWriteStream } from "fs"
import { randomUUID } from "crypto"
import { join } from "path"
import { tmpdir } from "os"

export const initializeCsvFileStreamStep = createStep(
  "initialize-csv-file-stream",
  async (input: { headers: string[] }) => {
    const filePath = join(tmpdir(), `product-feed-${randomUUID()}.csv`)
    const stream = createWriteStream(filePath, { encoding: "utf-8" })

    // Write headers
    const headerRow = input.headers.map((h) => `"${h}"`).join(",") + "\n"
    stream.write(headerRow)

    return new StepResponse({ filePath })
  }
)

export const finalizeCsvFileStreamStep = createStep(
  "finalize-csv-file-stream",
  async (input: { filePath: string }) => {
    // Stream is already closed by StreamWriter.end() in the processing step
    // This step just returns the filePath for consistency
    return new StepResponse({ filePath: input.filePath })
  }
)


