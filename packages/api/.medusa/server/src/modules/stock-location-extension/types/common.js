"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsDelayOption = exports.IsDelay = exports.DocumentMaxFileSize = exports.DocumentType = exports.ServisibilityStatusTypeMap = exports.ServisibilityStatusType = exports.StatusTypeMap = exports.StatusType = exports.AddressTypeMap = exports.AddressType = exports.LocationTypeMap = exports.LocationType = void 0;
var LocationType;
(function (LocationType) {
    LocationType[LocationType["DARK_STORE"] = 1] = "DARK_STORE";
    LocationType[LocationType["OMNI"] = 2] = "OMNI";
    LocationType[LocationType["HUB"] = 3] = "HUB";
})(LocationType || (exports.LocationType = LocationType = {}));
exports.LocationTypeMap = {
    [LocationType.DARK_STORE]: "Dark Store",
    [LocationType.OMNI]: "Omni",
    [LocationType.HUB]: "Hub",
};
var AddressType;
(function (AddressType) {
    AddressType[AddressType["REGISTER"] = 1] = "REGISTER";
    AddressType[AddressType["BILLING"] = 2] = "BILLING";
    AddressType[AddressType["SHIPPING"] = 3] = "SHIPPING";
})(AddressType || (exports.AddressType = AddressType = {}));
exports.AddressTypeMap = {
    [AddressType.REGISTER]: "Register",
    [AddressType.BILLING]: "Billing",
    [AddressType.SHIPPING]: "Shipping",
};
var StatusType;
(function (StatusType) {
    StatusType[StatusType["ACTIVE"] = 1] = "ACTIVE";
    StatusType[StatusType["INACTIVE"] = 2] = "INACTIVE";
})(StatusType || (exports.StatusType = StatusType = {}));
exports.StatusTypeMap = {
    [StatusType.ACTIVE]: "Active",
    [StatusType.INACTIVE]: "In-Active",
};
var ServisibilityStatusType;
(function (ServisibilityStatusType) {
    ServisibilityStatusType[ServisibilityStatusType["OPEN"] = 1] = "OPEN";
    ServisibilityStatusType[ServisibilityStatusType["CLOSE"] = 2] = "CLOSE";
    ServisibilityStatusType[ServisibilityStatusType["TEMPORARILY_CLOSE"] = 3] = "TEMPORARILY_CLOSE";
})(ServisibilityStatusType || (exports.ServisibilityStatusType = ServisibilityStatusType = {}));
exports.ServisibilityStatusTypeMap = {
    [ServisibilityStatusType.OPEN]: "Open",
    [ServisibilityStatusType.CLOSE]: "Close",
    [ServisibilityStatusType.TEMPORARILY_CLOSE]: "Temporarily Close",
};
var DocumentType;
(function (DocumentType) {
    DocumentType[DocumentType["PAN"] = 1] = "PAN";
    DocumentType[DocumentType["GST"] = 2] = "GST";
    DocumentType[DocumentType["FSSAI"] = 3] = "FSSAI";
})(DocumentType || (exports.DocumentType = DocumentType = {}));
exports.DocumentMaxFileSize = 3145728;
var IsDelay;
(function (IsDelay) {
    IsDelay[IsDelay["TRUE"] = 1] = "TRUE";
    IsDelay[IsDelay["FALSE"] = 2] = "FALSE";
})(IsDelay || (exports.IsDelay = IsDelay = {}));
exports.IsDelayOption = {
    [IsDelay.TRUE]: "True",
    [IsDelay.FALSE]: "False",
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL21vZHVsZXMvc3RvY2stbG9jYXRpb24tZXh0ZW5zaW9uL3R5cGVzL2NvbW1vbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxJQUFZLFlBSVg7QUFKRCxXQUFZLFlBQVk7SUFDdEIsMkRBQWMsQ0FBQTtJQUNkLCtDQUFRLENBQUE7SUFDUiw2Q0FBTyxDQUFBO0FBQ1QsQ0FBQyxFQUpXLFlBQVksNEJBQVosWUFBWSxRQUl2QjtBQUVZLFFBQUEsZUFBZSxHQUFHO0lBQzdCLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxFQUFFLFlBQVk7SUFDdkMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTTtJQUMzQixDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsRUFBRSxLQUFLO0NBQzFCLENBQUE7QUFFRCxJQUFZLFdBSVg7QUFKRCxXQUFZLFdBQVc7SUFDckIscURBQVksQ0FBQTtJQUNaLG1EQUFXLENBQUE7SUFDWCxxREFBWSxDQUFBO0FBQ2QsQ0FBQyxFQUpXLFdBQVcsMkJBQVgsV0FBVyxRQUl0QjtBQUVZLFFBQUEsY0FBYyxHQUFHO0lBQzVCLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxFQUFFLFVBQVU7SUFDbEMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEVBQUUsU0FBUztJQUNoQyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsRUFBRSxVQUFVO0NBQ25DLENBQUE7QUFFRCxJQUFZLFVBR1g7QUFIRCxXQUFZLFVBQVU7SUFDcEIsK0NBQVUsQ0FBQTtJQUNWLG1EQUFZLENBQUE7QUFDZCxDQUFDLEVBSFcsVUFBVSwwQkFBVixVQUFVLFFBR3JCO0FBRVksUUFBQSxhQUFhLEdBQUc7SUFDM0IsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsUUFBUTtJQUM3QixDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRSxXQUFXO0NBQ25DLENBQUE7QUFFRCxJQUFZLHVCQUlYO0FBSkQsV0FBWSx1QkFBdUI7SUFDakMscUVBQVEsQ0FBQTtJQUNSLHVFQUFTLENBQUE7SUFDVCwrRkFBcUIsQ0FBQTtBQUN2QixDQUFDLEVBSlcsdUJBQXVCLHVDQUF2Qix1QkFBdUIsUUFJbEM7QUFFWSxRQUFBLDBCQUEwQixHQUFHO0lBQ3hDLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTTtJQUN0QyxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxFQUFFLE9BQU87SUFDeEMsQ0FBQyx1QkFBdUIsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLG1CQUFtQjtDQUNqRSxDQUFBO0FBRUQsSUFBWSxZQUlYO0FBSkQsV0FBWSxZQUFZO0lBQ3RCLDZDQUFPLENBQUE7SUFDUCw2Q0FBTyxDQUFBO0lBQ1AsaURBQVMsQ0FBQTtBQUNYLENBQUMsRUFKVyxZQUFZLDRCQUFaLFlBQVksUUFJdkI7QUFFWSxRQUFBLG1CQUFtQixHQUFHLE9BQU8sQ0FBQTtBQUUxQyxJQUFZLE9BR1g7QUFIRCxXQUFZLE9BQU87SUFDakIscUNBQVEsQ0FBQTtJQUNSLHVDQUFTLENBQUE7QUFDWCxDQUFDLEVBSFcsT0FBTyx1QkFBUCxPQUFPLFFBR2xCO0FBQ1ksUUFBQSxhQUFhLEdBQUc7SUFDM0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTTtJQUN0QixDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxPQUFPO0NBQ3pCLENBQUEifQ==