import { ExecArgs } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { createReturnReasonsWorkflow } from '@medusajs/medusa/core-flows'

export default async function seedReturnReason({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  try {
    // Search for existing parent return reason with value "partial_delivery" using return_reason module query
    const { data: parentReasons } = await query.graph({
      entity: 'return_reason',
      fields: ['id', 'value', 'label', 'description'],
      filters: {
        value: 'partial_delivery'
      }
    })

    const parentReason = parentReasons?.[0]

    if (!parentReason) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        'Parent return reason with value "partial_delivery" not found. Please create it first.'
      )
    }

    // Check if the child return reason already exists using return_reason module query
    const { data: existingChildren } = await query.graph({
      entity: 'return_reason',
      fields: ['id', 'value', 'label', 'description'],
      filters: {
        value: 'try_and_buy'
      }
    })

    const existingChild = existingChildren?.[0]

    if (existingChild) {
      logger.info('Return reason with value "try_and_buy" already exists, skipping...')
      return existingChild
    }

    // Create the child return reason using default Medusa workflow
    const { result: insertedChild } = await createReturnReasonsWorkflow(container).run({
      input: {
        data: [
          {
            value: 'try_and_buy',
            label: 'Try And Buy',
            description: 'Try And Buy Product',
            parent_return_reason_id: parentReason.id
          }
        ]
      }
    })

    logger.info(`Successfully seeded return reason: ${insertedChild[0].value}`)
    return insertedChild[0]
  } catch (error) {
    logger.error('Error seeding return reason:', error)
    throw error
  }
}

