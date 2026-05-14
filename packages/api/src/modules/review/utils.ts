import { MedusaContainer } from "@medusajs/framework"

export async function getAvgRating(
  container: MedusaContainer,
  type: "seller" | "product",
  id: string
): Promise<string | null> {
  const knex = container.resolve("__pg_connection__")

  const joinField = type === "product" ? "product_id" : "seller_id"
  const joinTable =
    type === "product" ? "product_product_review_review" : "seller_seller_review_review"

  const [result] = await knex("review")
    .avg("review.rating")
    .leftJoin(joinTable, `${joinTable}.review_id`, "review.id")
    .where(`${joinTable}.${joinField}`, id)

  return result.avg
}

