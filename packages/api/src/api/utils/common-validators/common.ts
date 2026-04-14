import { z } from "zod"

export const AddressPayload = z
  .object({
    first_name: z.union([
      z.literal(''),
      z.string().trim().min(3).refine(
      noNumbers,
      'First name can only contain letters'
    )
    ]).optional(),
    last_name: z.string().optional(),
    phone: z.union([
      z.literal(''),
      z.string().trim().min(10).max(10).refine(
      indianPhoneRegex,
      'Phone number must be 10 digits starting with 6-9'
    )
    ]).optional(),
    company: z.string().optional().nullable(),
    address_1: z.string().trim().min(3).max(100),
    address_2: z.string().trim().min(3),
    city: z.string().trim().min(3),
    country_code: z.string().trim().min(2),
    province: z.string().trim().min(2).optional(),
    postal_code: z.string().trim().min(6).max(6).refine(
      noCharacters,
      'Postal code can only contain numbers'
    ),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict()

export const UpdateAddressPayload = z
  .object({
    first_name: z.union([
      z.literal(''),
      z.string().trim().min(3).refine(
        noNumbers,
        'First name can only contain letters'
      )
    ]).optional(),
  last_name: z.string().optional(),
    phone: z.union([
      z.literal(''),
      z.string().trim().min(10).max(10).refine(
        indianPhoneRegex,
        'Phone number must be 10 digits starting with 6-9'
      )
    ]).optional(),
    company: z.string().optional().nullable(),
    address_1: z.string().trim().min(3).max(100).optional(),
    address_2: z.string().trim().min(3).optional(),
    city: z.string().trim().min(3).optional(),
    country_code: z.string().trim().min(2).optional(),
    province: z.string().trim().optional(),
    postal_code: z.string().trim().min(6).max(6).refine(
      noCharacters,
      'Postal code can only contain numbers'
    ).optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict()

export const BigNumberInput = z.union([
  z.number(),
  z.string(),
  z.object({
    value: z.string(),
    precision: z.number(),
  }),
])

/**
 * Return a zod object to apply the $and and $or operators on a schema.
 *
 * @param {ZodObject<any>} schema
 * @return {ZodObject<any>}
 */
export const applyAndAndOrOperators = <T extends z.ZodObject<any>>(
  schema: T
) => {
  return schema.merge(
    z.object({
      $and: z.lazy(() => schema.array()).optional(),
      $or: z.lazy(() => schema.array()).optional(),
    })
  )
}

/**
 * Validates that a value is a boolean when it is passed as a string.
 */
export const booleanString = () =>
  z
    .union([z.boolean(), z.string()])
    .refine((value) => {
      return ["true", "false"].includes(value.toString().toLowerCase())
    })
    .transform((value) => {
      return value.toString().toLowerCase() === "true"
    })

/**
 * Apply a transformer on a schema when the data are validated and recursively normalize the data $and and $or.
 *
 * @param {(data: Data) => NormalizedData} transform
 * @return {(data: Data) => NormalizedData}
 */
export function recursivelyNormalizeSchema<
  Data extends object,
  NormalizedData extends object
>(transform: (data: Data) => NormalizedData): (data: Data) => NormalizedData {
  return (data: any) => {
    const normalizedData = transform(data)

    Object.keys(normalizedData)
      .filter((key) => ["$and", "$or"].includes(key))
      .forEach((key) => {
        normalizedData[key] = normalizedData[key].map(transform)
      })

    return normalizedData
  }
}

export function noNumbers(value: string) {
    if (!/\d/.test(value)) {
      return true
    }
    return false
} 

export function noCharacters(value: string) {
    if (/^\d+$/.test(value)) {
      return true
    }
    return false
  }

  export const paginationParams = z.object({
    offset: z.coerce.number().nonnegative().optional().default(0),
    limit: z.coerce.number().nonnegative().optional().default(20),
    order: z.string().optional()
  }).strict()


  export function indianPhoneRegex(value: string) {
    if (/^[6-9]\d{9}$/.test(value)) {
      return true
    }
    return false
  }
