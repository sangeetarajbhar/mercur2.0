import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export const enhanceOrderItemsWithReturnsStep = createStep(
  "enhance-order-items-with-returns-step",
  async (orderSets: any[], { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    // Extract all order IDs from order sets
    const orderIds: string[] = [];
    orderSets.forEach((orderSet: any) => {
      if (orderSet.orders) {
        orderSet.orders.forEach((order: any) => {
          if (order.id) {
            orderIds.push(order.id);
          }
        });
      }
    });

    if (orderIds.length === 0) {
      return new StepResponse(orderSets);
    }

    // Fetch all returns for these orders with items and reasons
    const { data: returns } = await query.graph({
      entity: "return",
      fields: [
        "id",
        "order_id",
        "status",
        "created_at",
        "updated_at",
        "items.*",
        "items.item_id",
        "items.quantity",
        "items.reason_id",
        "items.note",
        "items.reason.*"
      ],
      filters: {
        order_id: orderIds
      }
    });

    // Create a map of order line item ID to returns
    const itemReturnsMap = new Map<string, any[]>();

    returns.forEach((returnRecord: any) => {
      if (returnRecord.items) {
        returnRecord.items.forEach((returnItem: any) => {
          const itemId = returnItem.item_id;
          if (!itemReturnsMap.has(itemId)) {
            itemReturnsMap.set(itemId, []);
          }
          itemReturnsMap.get(itemId)?.push({
            return_id: returnRecord.id,
            return_status: returnRecord.status,
            return_created_at: returnRecord.created_at,
            return_updated_at: returnRecord.updated_at,
            quantity: returnItem.quantity,
            reason: returnItem.reason,
            note: returnItem.note
          });
        });
      }
    });

    // Enhance order items with returns data
    const enhancedOrderSets = orderSets.map((orderSet: any) => {
      if (!orderSet.orders) return orderSet;

      const enhancedOrders = orderSet.orders.map((order: any) => {
        if (!order.items) return order;

        const enhancedItems = order.items.map((item: any) => {
          const itemReturns = itemReturnsMap.get(item.id) || [];
          return {
            ...item,
            returns: itemReturns[0] || null
          };
        });

        return {
          ...order,
          items: enhancedItems
        };
      });

      return {
        ...orderSet,
        orders: enhancedOrders
      };
    });

    return new StepResponse(enhancedOrderSets);
  }
);

