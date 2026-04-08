"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const workflows_1 = require("@mercurjs/core-plugin/workflows");
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const utils_1 = require("@medusajs/framework/utils");
const types_1 = require("@mercurjs/types");
workflows_1.createSellerWorkflow.hooks.validateSellerInput(async ({ input }) => {
    if (input.seller.status === types_1.SellerStatus.ACTIVE) {
        throw new utils_1.MedusaError(utils_1.MedusaError.Types.INVALID_DATA, `Seller cannot be created with status "active". Use "pending" status and submit for review.`);
    }
    return new workflows_sdk_1.StepResponse(undefined);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsbGVyLWNyZWF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvd29ya2Zsb3dzL2hvb2tzL3NlbGxlci1jcmVhdGVkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsK0RBQXNFO0FBQ3RFLHFFQUFnRTtBQUNoRSxxREFBdUQ7QUFDdkQsMkNBQThDO0FBRTlDLGdDQUFvQixDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FDNUMsS0FBSyxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRTtJQUNsQixJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxLQUFLLG9CQUFZLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDaEQsTUFBTSxJQUFJLG1CQUFXLENBQ25CLG1CQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFDOUIsNEZBQTRGLENBQzdGLENBQUE7SUFDSCxDQUFDO0lBRUQsT0FBTyxJQUFJLDRCQUFZLENBQUMsU0FBUyxDQUFDLENBQUE7QUFDcEMsQ0FBQyxDQUNGLENBQUEifQ==