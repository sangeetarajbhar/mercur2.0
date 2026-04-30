// src/workflows/retrieve-order-return-details.ts

import {
  createStep,
  StepResponse,
  createWorkflow,
  WorkflowResponse,
  parallelize,
} from "@medusajs/framework/workflows-sdk";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { Knex } from 'knex'
import {getReturnLocationDetails} from "./returns"
import PaymentRefundLink from '../../links/refund-order-line-item'
import returnRefundMethod from '../../links/return_refund_method'
import { CUSTOMER_REFUND_METHODS_MODULE } from '../../modules/customer_refund_methods'
import CustomerRefundMethodModuleService from '../../modules/customer_refund_methods/service'
import CustomerBankAccountVerificationService from '../../modules/customer-bank-account-verification/service'
import { CUSTOMER_BANK_ACCOUNT_VERIFICATION_MODULE } from '../../modules/customer-bank-account-verification'
import { decryptFromStorage } from '../../modules/customer_refund_methods/utils/encryption'
import ReturnRefundTypeLinkModuleService from "../../modules/return-refund-type-link/service";
import { RETURN_REFUND_TYPE_LINK_MODULE } from "../../modules/return-refund-type-link";
import {ReturnRefundTypeLinkStatus} from "../../utils/constants/return_refund_type_link";
import {
  BankAccountType,
  CustomerBankDetailStatus,
  CustomerUpiDetailStatus
} from "../../utils/constants/bank_account_verification";
import CustomerUpiModuleService from "../../modules/customer-upi-detail/service";
import { CUSTOMER_UPI_MODULE } from "../../modules/customer-upi-detail";
import CustomerBankModuleService from "../../modules/customer-bank-detail/service";
import { CUSTOMER_BANK_MODULE } from "../../modules/customer-bank-detail";


// Step 1: Retrieve shipping address only (billing_address not used in UI)
const getAddressesStep = createStep(
  "get-addresses",
  async ({ order } : any, { container }) : Promise<any>  => {
    if (!order?.shipping_address_id) return new StepResponse({});
    const cartModuleService = container.resolve(Modules.CART);
    const [shipping_address] = await cartModuleService.listAddresses({
      id: [order.shipping_address_id],
    });
    return new StepResponse({ shipping_address });
  }
);

// Step 2: Retrieve customer by ID
const getCustomerStep = createStep(
  "get-customer",
  async ({ order } : any, { container }) => {
    if (!order?.customer_id) return new StepResponse({});
    const customerModuleService = container.resolve(Modules.CUSTOMER);
    const customer = await customerModuleService.retrieveCustomer(order.customer_id);
    return new StepResponse({ customer });
  }
);

// Step 3: Retrieve line item details
const getLineItemStep = createStep(
  "get-line-item",
  async ({ items } : any, { container }) => {
    if (!items?.[0]?.item_id) return new StepResponse({});
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as Knex;
    const orderModuleService = container.resolve(Modules.ORDER);
    const lineItem = await orderModuleService.retrieveOrderLineItem(items[0].item_id);

    // Fetch full order_line_item_extension with all fields (as it was before optimization)
    const lineItemExtension = await knex('order_line_item_extension')
      .select('*')
      .where('order_line_item_id', items[0].item_id)
      .whereNull('deleted_at')
      .first();

    // Return full line item object with all fields (as it was before)
    // This includes all pricing fields: unit_price, compare_at_unit_price, raw_unit_price, etc.
    const itemDetailsWithExtension = {
      ...lineItem,
      order_line_item_extension: lineItemExtension || null
    };

    return new StepResponse({ item_details: itemDetailsWithExtension });
  }
);

// Step 4: Retrieve payment details
const getPaymentDetailsStep = createStep(
  "get-payment-details",
  async ({ orderId, lineItemId, status } : any, { container }) => {
    if (!orderId) return new StepResponse({});
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    // Fetch payment collections for the order - using wildcards as they're more efficient for nested structures
    // Only fetch if we have an orderId to avoid unnecessary queries
    const { data: orders } = await query.graph({
      filters: {
        id: orderId
      },
      entity: "order",
      fields: [
        "split_order_payment.*",
        "payment_collections.*",
        "payment_collections.payment_sessions.*",
        "payment_collections.payment_sessions.payment.*",
      ],
    });

    const paymentCollections = (orders[0] as any)?.payment_collections || null;
    const splitOrderPayments = (orders[0] as any)?.split_order_payment || null;

    // @TODO if payment_session is deleted, then get provider_id from payment table
    // const {
    //   data: [payment]
    // } = await query.graph({
    //   entity: 'payment',
    //   fields: ['id', 'provider_id'],
    //   filters: {
    //     payment_collection_id: paymentCollections[0].id,
    //     deleted_at: {
    //       $eq: null,
    //     },
    //   },
    //   pagination: {
    //     order: {
    //       payment_collection_id: "DESC",
    //     },
    //   },
    // })

    let refundOrderLineItemLinks: any[] = [];

    // If lineItemId is provided and status is "refunded", fetch refund-order-line-item links
    if (lineItemId && status === "refunded") {
      // Use query.graph directly - more reliable than guessing table names
      const { data: links } = await query.graph({
        entity: PaymentRefundLink.entryPoint,
        fields: [
          'refund_id',
          'order_line_item_id',
          'refund.id',
          'refund.amount',
          'refund.created_at'
        ],
        filters: {
          order_line_item_id: lineItemId
        }
      });
      refundOrderLineItemLinks = links || [];
    }

    return new StepResponse({
      payment_details: paymentCollections && paymentCollections.length > 0 ? paymentCollections : null,
      split_order_payment: splitOrderPayments || null,
      refund_order_line_item_links: refundOrderLineItemLinks,
      // payment: payment || null,
    });
  }
);

// Step 5: Retrieve and decrypt customer refund method
const getCustomerRefundMethodStep = createStep(
  "get-customer-refund-method",
  async ({ returnId } : any, { container }) => {
    if (!returnId) return new StepResponse({});
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const customerRefundMethodService = container.resolve<CustomerRefundMethodModuleService>(CUSTOMER_REFUND_METHODS_MODULE);

    try {
      // Use query.graph with specific fields instead of wildcards for better performance
      const { data: links } = await query.graph({
        entity: returnRefundMethod.entryPoint,
        fields: [
          'customer_refund_method.id'
        ],
        filters: {
          return_id: returnId
        }
      });

      if (!links || links.length === 0 || !links[0].customer_refund_method) {
        return new StepResponse({ customer_refund_method: null, customer_bank_account_verification: null });
      }

      const refundMethodId = links[0].customer_refund_method.id;

      // Decrypt the customer refund method
      const decryptedMethod = await customerRefundMethodService.decryptRefundMethod(refundMethodId);

      const customerBankAccountVerificationService =
        container.resolve<CustomerBankAccountVerificationService>(CUSTOMER_BANK_ACCOUNT_VERIFICATION_MODULE)

      const customerBankAccountVerification =
        await customerBankAccountVerificationService.listCustomerBankAccountVerifications(
          {
            customer_refund_method_id: refundMethodId
          }
        )

      const customerBankAccountVerificationObject =
        customerBankAccountVerification.length > 0 ? customerBankAccountVerification[0] : null

      if (customerBankAccountVerificationObject?.raw_gateway_response_enc) {
        const decrypted = decryptFromStorage(
          customerBankAccountVerificationObject.raw_gateway_response_enc
        )

        try {
          customerBankAccountVerificationObject.raw_gateway_response_enc =
            JSON.parse(decrypted)
        } catch {
          // fallback: keep decrypted string if anything goes wrong
          customerBankAccountVerificationObject.raw_gateway_response_enc =
            decrypted
        }
      }

      return new StepResponse({ customer_refund_method: decryptedMethod, customer_bank_account_verification: customerBankAccountVerificationObject });

    } catch (error) {
      console.error('Error fetching/decrypting customer refund method:', error);
      return new StepResponse({ customer_refund_method: null });
    }
  }

);

const getCustomerReturnRefundTypeLinkStep = createStep(
  "get-customer-return-refund-type-link",
  async ({ returnId } : any, { container }) => {

    if (!returnId) return new StepResponse({});

    const customerReturnRefundTypeLinkService = container.resolve<ReturnRefundTypeLinkModuleService>(RETURN_REFUND_TYPE_LINK_MODULE);

    const returnRefundTypeLink = await customerReturnRefundTypeLinkService.listReturnRefundTypeLinks({
      return_id: returnId,
      status: ReturnRefundTypeLinkStatus.ACTIVE
    },
      {
        select: ['id', 'return_id', 'type', 'type_id', 'customer_id', 'status', 'created_by', 'created_at']
      }
    )

    if (!returnRefundTypeLink || returnRefundTypeLink.length === 0) {
      return new StepResponse({
        customer_bank_account_verification_return_refund_type_link: null,
        return_refund_type_link: null,
        customer_upi_detail: null,
        customer_bank_detail: null,
        type: null
      });
    }

    const type = returnRefundTypeLink[0].type
    const typeId = returnRefundTypeLink[0].type_id

    const customerUpiDetailService =
      container.resolve<CustomerUpiModuleService>(CUSTOMER_UPI_MODULE)

    const customerBankDetailService =
      container.resolve<CustomerBankModuleService>(CUSTOMER_BANK_MODULE)

    const customerBankAccountVerificationService =
      container.resolve<CustomerBankAccountVerificationService>(CUSTOMER_BANK_ACCOUNT_VERIFICATION_MODULE)

    let customerBankAccountVerificationId: string | null = null;
    let customerUpiDetail;
    let customerBankDetail;

    const returnRefundLink = returnRefundTypeLink[0]

    if (type === BankAccountType.UPI) {
      const existingDetails =
        await customerUpiDetailService.listCustomerUpiDetails({
            id: typeId,
            deleted_at: null,
            status: CustomerUpiDetailStatus.ACTIVE,
          },
          {
            select: ["id", "customer_bank_account_verification_id", "masked_upi", "status", "created_at", "upi_id_enc",]
          }
        )

      if (!existingDetails || existingDetails.length === 0) {
        return new StepResponse({
          customer_bank_account_verification_return_refund_type_link: null,
          return_refund_type_link: null,
          customer_upi_detail: null,
          customer_bank_detail: null,
          type: null
        });
      }

      customerBankAccountVerificationId = existingDetails[0].customer_bank_account_verification_id
      customerUpiDetail = existingDetails[0]
      if (customerUpiDetail?.upi_id_enc) {
        try {
          const isMasked = process.env.DISPLAY_MASKED_UPI_BANK_DETAILS || 'true'
          if (isMasked === 'true') {
            customerUpiDetail.upi_id = decryptFromStorage(customerUpiDetail.upi_id_enc)
          } else {
            customerUpiDetail.upi_id = customerUpiDetail.masked_upi
          }
        } catch {
          customerUpiDetail.upi_id = customerUpiDetail.upi_id_enc
        }
      }
    }

    if (type === BankAccountType.BANK) {
      const existingDetails =
        await customerBankDetailService.listCustomerBankDetails({
            id: typeId,
            deleted_at: null,
            status: CustomerBankDetailStatus.ACTIVE,
          },
          {
            select: ["id", "customer_bank_account_verification_id", "masked_account", "masked_holder", "status", "created_at", "account_number_enc", "account_holder_enc", "ifsc_code",]
          }
        )

      if (!existingDetails || existingDetails.length === 0) {
        return new StepResponse({
          customer_bank_account_verification_return_refund_type_link: null,
          return_refund_type_link: null,
          customer_upi_detail: null,
          customer_bank_detail: null,
          type: null
        });
      }

      customerBankAccountVerificationId = existingDetails[0].customer_bank_account_verification_id
      customerBankDetail = existingDetails[0]
      if (customerBankDetail?.account_number_enc) {
        try {
          const isMasked = process.env.DISPLAY_MASKED_UPI_BANK_DETAILS || 'true'
          if (isMasked === 'true') {
            customerBankDetail.account_number = decryptFromStorage(customerBankDetail.account_number_enc)
          } else {
            customerBankDetail.account_number = customerBankDetail.masked_account
          }
        } catch {
          customerBankDetail.account_number = customerBankDetail.account_number_enc
        }
      }
      if (customerBankDetail?.account_holder_enc) {
        try {
          const isMasked = process.env.DISPLAY_MASKED_UPI_BANK_DETAILS || 'true'
          if (isMasked === 'true') {
            customerBankDetail.account_holder_name = decryptFromStorage(customerBankDetail.account_holder_enc)
          } else {
            customerBankDetail.account_holder_name = customerBankDetail.masked_holder
          }
        } catch {
          customerBankDetail.account_holder_name = customerBankDetail.account_holder_enc
        }
      }
    }

    if (customerBankAccountVerificationId) {
      const customerBankAccountVerification =
        await customerBankAccountVerificationService.retrieveCustomerBankAccountVerification(customerBankAccountVerificationId)

      if (customerBankAccountVerification?.raw_gateway_response_enc) {
        const decrypted = decryptFromStorage(
          customerBankAccountVerification.raw_gateway_response_enc
        )

        try {
          customerBankAccountVerification.raw_gateway_response_enc =
            JSON.parse(decrypted)
        } catch {
          // fallback: keep decrypted string if anything goes wrong
          customerBankAccountVerification.raw_gateway_response_enc =
            decrypted
        }
      }

      return new StepResponse({
        customer_bank_account_verification_return_refund_type_link: customerBankAccountVerification,
        return_refund_type_link: returnRefundLink,
        customer_upi_detail: customerUpiDetail ?? null,
        customer_bank_detail: customerBankDetail ?? null,
        type: type,
      });
    } else {
      return new StepResponse({
        customer_bank_account_verification_return_refund_type_link: null,
        return_refund_type_link: null,
        customer_upi_detail: null,
        customer_bank_detail: null,
        type: null
      });
    }
  }
);

// Compose the workflow
export const retrieveOrderReturnDetailsWorkflow = createWorkflow({
  name: "retrieve-order-return-details",
},
  ( {orderReturn} : any ) => {
    // Run independent steps in parallel for better performance
    const addressesResult = getAddressesStep({ order: orderReturn?.order });
    const customerResult = getCustomerStep({ order: orderReturn?.order });
    const itemDetailsResult = getLineItemStep({ items: orderReturn?.items });
    const paymentDetailsResult = getPaymentDetailsStep({
      orderId: orderReturn?.order_id,
      lineItemId: orderReturn?.items?.[0]?.item_id,
      status: orderReturn?.status
    });
    const customerRefundMethodResult = getCustomerRefundMethodStep({ returnId: orderReturn?.id });
    const returnLocationResult = getReturnLocationDetails({locationId: orderReturn?.fulfillments[0]?.location_id,returnId:orderReturn.id});
    const customerReturnRefundTypeLinkResult = getCustomerReturnRefundTypeLinkStep({ returnId: orderReturn?.id });

    // Execute all independent steps in parallel
    parallelize(
      addressesResult,
      customerResult,
      itemDetailsResult,
      paymentDetailsResult,
      customerRefundMethodResult,
      returnLocationResult,
      customerReturnRefundTypeLinkResult,
    );

    const { shipping_address } : any = addressesResult;
    const { customer } : any = customerResult;
    const { item_details } : any = itemDetailsResult;
    const { payment_details, refund_order_line_item_links, split_order_payment  } : any = paymentDetailsResult;
    const { customer_refund_method, customer_bank_account_verification } : any = customerRefundMethodResult;
    const returnLocation = returnLocationResult
    const {
      customer_bank_account_verification_return_refund_type_link,
      return_refund_type_link,
      customer_upi_detail,
      customer_bank_detail,
      type
    } : any = customerReturnRefundTypeLinkResult

    // You can add more steps for fulfillments if needed

    return new WorkflowResponse({
      orderReturn,
      shipping_address,
      customer,
      item_details,
      payment_details,
      refund_order_line_item_links,
      returnLocation,
      split_order_payment,
      customer_refund_method,
      customer_bank_account_verification,
      customer_bank_account_verification_return_refund_type_link,
      return_refund_type_link,
      customer_upi_detail,
      customer_bank_detail,
      type,
    });
  }
);
