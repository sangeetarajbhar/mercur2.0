import { randomUUID } from "crypto"
import { MedusaService } from "@medusajs/framework/utils"
import { Logger, MedusaContainer } from "@medusajs/framework/types"
import RatingConfig from "./models/rating-config"
import RatingFeedback from "./models/rating-feedback"

// ─── Domain types ─────────────────────────────────────────────────────────────

export type RatingStatus = "active" | "inactive" | "draft"
export type FeedbackStatus = "active" | "archived"

export type RatingConfigRecord = {
  id: string
  status: RatingStatus
  option_text: string | null
  sort_order: number
  created_by: string | null
  updated_by: string | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export type RatingFeedbackRecord = {
  id: string
  session_id: string
  status: FeedbackStatus
  customer_id: string | null
  order_id: string | null
  rating: number
  option_id: string | null
  custom_text: string | null
  created_by: string | null
  updated_by: string | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

// ─── Input types ──────────────────────────────────────────────────────────────

export interface CreateRatingOptionInput {
  option_text: string
  sort_order?: number
  status?: RatingStatus
  created_by?: string | null
  updated_by?: string | null
}

export interface UpdateRatingOptionInput {
  option_text?: string
  sort_order?: number
  status?: RatingStatus
  updated_by?: string | null
}

export interface CreateRatingFeedbackInput {
  customer_id?: string | null
  order_id?: string | null
  rating: number
  selected_option_ids?: string[]
  custom_text?: string | null
}

// ─── Service ──────────────────────────────────────────────────────────────────

class RatingService extends MedusaService({
  RatingConfig,
  RatingFeedback,
}) {
  private logger_: Logger

  constructor(container: MedusaContainer) {
    super(...arguments)
    this.logger_ = (container as Record<string, unknown>).logger as Logger
  }

  async listActiveOptions(): Promise<RatingConfigRecord[]> {
    return (await this.listRatingConfigs(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { status: "active" } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { order: { sort_order: "asc" } } as any
    )) as unknown as RatingConfigRecord[]
  }

  async createOption(input: CreateRatingOptionInput): Promise<RatingConfigRecord> {
    const optionText = (input.option_text ?? "").trim()
    if (!optionText) throw new Error("option_text is required")

    const payload = {
      status: input.status ?? "active",
      option_text: optionText,
      sort_order: input.sort_order ?? 0,
      created_by: input.created_by ?? null,
      updated_by: input.updated_by ?? null,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (await this.createRatingConfigs(payload as any)) as unknown as RatingConfigRecord
  }

  async updateOption(
    id: string,
    input: UpdateRatingOptionInput
  ): Promise<RatingConfigRecord> {
    const update: Record<string, unknown> = { id }

    if (input.option_text !== undefined) {
      const optionText = (input.option_text ?? "").trim()
      if (!optionText) throw new Error("option_text cannot be empty")
      update.option_text = optionText
    }
    if (input.sort_order !== undefined) update.sort_order = input.sort_order
    if (input.status !== undefined) update.status = input.status
    if (input.updated_by !== undefined) update.updated_by = input.updated_by

    return (await this.updateRatingConfigs(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      update as any
    )) as unknown as RatingConfigRecord
  }

  async createFeedback(
    input: CreateRatingFeedbackInput
  ): Promise<RatingFeedbackRecord[]> {
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
      throw new Error("rating must be an integer between 1 and 5")
    }

    const selected = Array.from(
      new Set((input.selected_option_ids ?? []).filter(Boolean))
    )

    if (selected.length > 5) throw new Error("You can select up to 5 options")

    if (selected.length) {
      const options = (await this.listRatingConfigs(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { id: selected, status: "active" } as any,
        { take: 20 }
      )) as unknown as RatingConfigRecord[]

      if (options.length !== selected.length) {
        throw new Error("One or more selected options are invalid or inactive")
      }
    }

    const session_id = randomUUID()
    const base = {
      session_id,
      status: "active" as const,
      customer_id: input.customer_id ?? null,
      order_id: input.order_id ?? null,
      rating: input.rating,
    }

    // One row per selected option; if none selected, one row with option_id=null
    const rows =
      selected.length > 0
        ? selected.map((option_id) => ({
            ...base,
            option_id,
            custom_text: input.custom_text ?? null,
          }))
        : [{ ...base, option_id: null, custom_text: input.custom_text ?? null }]

    const created = (await this.createRatingFeedbacks(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rows as any
    )) as unknown as RatingFeedbackRecord | RatingFeedbackRecord[]

    return Array.isArray(created) ? created : [created]
  }
}

export default RatingService
