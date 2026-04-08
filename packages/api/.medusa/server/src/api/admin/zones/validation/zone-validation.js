"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSlotDefinitionMiddleware = validateSlotDefinitionMiddleware;
exports.validateUniquePostcodesMiddleware = validateUniquePostcodesMiddleware;
const validators_1 = require("../validators");
const zone_1 = require("../../../../modules/zone");
function validateSlotDefinitionMiddleware(req, res, next) {
    try {
        const validatedBody = validators_1.CreateBulkSlotDefinitionSchema.parse(req.body);
        req.validatedBody = validatedBody;
        next();
    }
    catch (error) {
        const zodError = error;
        const errorMessages = zodError.errors?.map((e) => e.message).join("; ") || zodError.message || "Validation error";
        return res.status(400).json({
            type: "invalid_data",
            message: `Invalid request: ${errorMessages}`,
        });
    }
}
async function validateUniquePostcodesMiddleware(req, res, next) {
    try {
        debugger;
        const zoneService = req.scope.resolve(zone_1.ZONE_MODULE);
        const body = (req.validatedBody || req.body);
        const zoneId = req.params?.id;
        const inputPostcodes = Array.isArray(body?.postcodes) ? body.postcodes : [];
        if (!inputPostcodes.length) {
            return next();
        }
        const zones = await zoneService.listZones({});
        if (zones?.length) {
            const normalized = new Set(inputPostcodes.map((p) => String(p).trim().toLowerCase()));
            for (const z of zones) {
                if (zoneId && z.id === zoneId)
                    continue;
                const zPostcodes = Array.isArray(z.postcodes) ? z.postcodes : [];
                const overlap = zPostcodes.some((p) => normalized.has(String(p).trim().toLowerCase()));
                if (overlap) {
                    return res.status(400).json({
                        type: "invalid_data",
                        message: "One or more postcodes are already assigned to another zone",
                    });
                }
            }
        }
        next();
    }
    catch (error) {
        return res.status(500).json({
            error: "Failed to validate unique postcodes",
            details: error instanceof Error ? error.message : String(error),
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiem9uZS12YWxpZGF0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2FwaS9hZG1pbi96b25lcy92YWxpZGF0aW9uL3pvbmUtdmFsaWRhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUtBLDRFQWtCQztBQUVELDhFQStDQztBQXZFRCw4Q0FBOEQ7QUFFOUQsbURBQXNEO0FBRXRELFNBQWdCLGdDQUFnQyxDQUM5QyxHQUFrQixFQUNsQixHQUFtQixFQUNuQixJQUF3QjtJQUV4QixJQUFJLENBQUM7UUFDSCxNQUFNLGFBQWEsR0FBRywyQ0FBOEIsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3BFLEdBQUcsQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFBO1FBQ2pDLElBQUksRUFBRSxDQUFBO0lBQ1IsQ0FBQztJQUFDLE9BQU8sS0FBYyxFQUFFLENBQUM7UUFDeEIsTUFBTSxRQUFRLEdBQUcsS0FBa0UsQ0FBQTtRQUNuRixNQUFNLGFBQWEsR0FDakIsUUFBUSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksUUFBUSxDQUFDLE9BQU8sSUFBSSxrQkFBa0IsQ0FBQTtRQUM3RixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQzFCLElBQUksRUFBRSxjQUFjO1lBQ3BCLE9BQU8sRUFBRSxvQkFBb0IsYUFBYSxFQUFFO1NBQzdDLENBQUMsQ0FBQTtJQUNKLENBQUM7QUFDSCxDQUFDO0FBRU0sS0FBSyxVQUFVLGlDQUFpQyxDQUNyRCxHQUFrQixFQUNsQixHQUFtQixFQUNuQixJQUF3QjtJQUV4QixJQUFJLENBQUM7UUFDSCxRQUFRLENBQUE7UUFFUixNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBb0Isa0JBQVcsQ0FBQyxDQUFBO1FBRXJFLE1BQU0sSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLGFBQWEsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUcxQyxDQUFBO1FBRUQsTUFBTSxNQUFNLEdBQUksR0FBRyxDQUFDLE1BQTBCLEVBQUUsRUFBRSxDQUFBO1FBQ2xELE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFFM0UsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMzQixPQUFPLElBQUksRUFBRSxDQUFBO1FBQ2YsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUU3QyxJQUFJLEtBQUssRUFBRSxNQUFNLEVBQUUsQ0FBQztZQUNsQixNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3JGLEtBQUssTUFBTSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUM7Z0JBQ3RCLElBQUksTUFBTSxJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssTUFBTTtvQkFBRSxTQUFRO2dCQUV2QyxNQUFNLFVBQVUsR0FBYSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBO2dCQUMxRSxNQUFNLE9BQU8sR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ3RGLElBQUksT0FBTyxFQUFFLENBQUM7b0JBQ1osT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQzt3QkFDMUIsSUFBSSxFQUFFLGNBQWM7d0JBQ3BCLE9BQU8sRUFBRSw0REFBNEQ7cUJBQ3RFLENBQUMsQ0FBQTtnQkFDSixDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxJQUFJLEVBQUUsQ0FBQTtJQUNSLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxQixLQUFLLEVBQUUscUNBQXFDO1lBQzVDLE9BQU8sRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO1NBQ2hFLENBQUMsQ0FBQTtJQUNKLENBQUM7QUFDSCxDQUFDIn0=