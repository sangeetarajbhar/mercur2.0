import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { RATING_MODULE } from "../../../../../modules/rating"
import RatingService, {
  UpdateRatingOptionInput,
} from "../../../../../modules/rating/service"

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const ratingService = req.scope.resolve(RATING_MODULE) as RatingService

  const option = await ratingService.updateOption(
    req.params.id,
    {
      ...(req.validatedBody as UpdateRatingOptionInput),
      updated_by: req.auth_context.actor_id,
    }
  )

  res.json({ option })
}

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const ratingService = req.scope.resolve(RATING_MODULE) as RatingService

  await ratingService.softDeleteRatingConfigs(req.params.id as any)
  res.status(204).send()
}
