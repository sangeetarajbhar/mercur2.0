"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateZoneTimingWorkflow = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const steps_1 = require("../steps");
exports.updateZoneTimingWorkflow = (0, workflows_sdk_1.createWorkflow)({
    name: "update-zone-timing",
}, function (input) {
    const result = (0, steps_1.updateZoneTimingStep)(input);
    return new workflows_sdk_1.WorkflowResponse(result);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLXpvbmUtdGltaW5nLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL3dvcmtmbG93cy96b25lL3dvcmtmbG93cy91cGRhdGUtem9uZS10aW1pbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEscUVBRzBDO0FBRTFDLG9DQUErQztBQVdsQyxRQUFBLHdCQUF3QixHQUFHLElBQUEsOEJBQWMsRUFDcEQ7SUFDRSxJQUFJLEVBQUUsb0JBQW9CO0NBQzNCLEVBQ0QsVUFBVSxLQUFvQztJQUM1QyxNQUFNLE1BQU0sR0FBRyxJQUFBLDRCQUFvQixFQUFDLEtBQUssQ0FBQyxDQUFBO0lBQzFDLE9BQU8sSUFBSSxnQ0FBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtBQUNyQyxDQUFDLENBQ0YsQ0FBQSJ9