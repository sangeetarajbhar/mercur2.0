export const parseDateFilter = (
  input: unknown,
  extractedOrderParam?: { current: string | undefined }
) => {
  if (!input || typeof input !== "object") {
    return input
  }

  const value = { ...(input as Record<string, unknown>) }
  if ("order" in value && typeof value.order === "string") {
    extractedOrderParam && (extractedOrderParam.current = value.order)
    delete value.order
  }
  return value
}
