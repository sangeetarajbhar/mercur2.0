/**
 * Stream Writer Service
 * Single Responsibility: Handles file stream writing operations
 * Shared service used by both product variant feed and inventory feed
 */

import { WriteStream } from "fs"

export interface IStreamWriter {
  write(content: string): Promise<void>
  end(): Promise<void>
  destroy(): void
}

export class StreamWriter implements IStreamWriter {
  constructor(private stream: WriteStream) {}

  async write(content: string): Promise<void> {
    const canContinue = this.stream.write(content)
    if (!canContinue) {
      await new Promise<void>((resolve) => {
        this.stream.once('drain', resolve)
      })
    }
  }

  async end(): Promise<void> {
    this.stream.end()
    await new Promise<void>((resolve, reject) => {
      this.stream.on('finish', resolve)
      this.stream.on('error', reject)
    })
  }

  destroy(): void {
    this.stream.destroy()
  }
}
