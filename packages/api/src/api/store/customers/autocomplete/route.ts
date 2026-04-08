import { MedusaRequest, MedusaResponse } from "@medusajs/framework"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { query } = req.query
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Missing or invalid search query" })
  }
  const googleLocationService = req.scope.resolve("google_location") as {
    getAutocomplete: (input: string) => Promise<any>
  }
  const autocompleteResults = await googleLocationService.getAutocomplete(query)
  res.json(autocompleteResults)
}
