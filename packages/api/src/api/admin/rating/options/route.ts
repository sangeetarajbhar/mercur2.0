import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { RATING_MODULE } from "../../../../modules/rating"
import RatingService, {
  CreateRatingOptionInput,
  RatingConfigRecord,
} from "../../../../modules/rating/service"

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const ratingService = req.scope.resolve(RATING_MODULE) as RatingService

  const options = (await ratingService.listRatingConfigs(
    {} as any,
    { order: { sort_order: "asc" } } as any
  )) as unknown as RatingConfigRecord[]

  res.json({ options: options.filter((o) => !!o.option_text) })
}

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const ratingService = req.scope.resolve(RATING_MODULE) as RatingService

  const option = await ratingService.createOption(
    {
      ...(req.validatedBody as CreateRatingOptionInput),
      created_by: req.auth_context.actor_id,
      updated_by: req.auth_context.actor_id,
    }
  )

  res.status(201).json({ option })
}
