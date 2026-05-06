/**
 * Image resolution constants shared across PDP/PLP transforms.
 */

/**
 * Legacy dimension-based resolution mapping for old seller import products.
 * These products store paths without size folders and use dimension-based S3 folders.
 */
export const IMAGE_RESOLUTION_MAPPING: Record<string, string> = {
  "1x": "80x107",
  "2x": "160x213",
  "3x": "256x341",
  "4x": "512x683",
  "5x": "800x1067",
  "6x": "960x1280",
}

/**
 * Default resolution keys returned by PDP when client doesn't request a list.
 */
export const DEFAULT_RESOLUTION_KEYS = ["1x", "2x", "3x", "4x"] as const

export const IMAGE_RESOLUTION_TO_VARIANT: Record<string, string> = {
  "1x": "thumb",
  "2x": "thumb",
  "3x": "small",
  "4x": "medium",
  "5x": "large",
  "6x": "xlarge"
}
