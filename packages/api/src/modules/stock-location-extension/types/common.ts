export enum LocationType {
  DARK_STORE = 1,
  OMNI = 2,
  HUB = 3,
}

export const LocationTypeMap = {
  [LocationType.DARK_STORE]: "Dark Store",
  [LocationType.OMNI]: "Omni",
  [LocationType.HUB]: "Hub",
}

export enum AddressType {
  REGISTER = 1,
  BILLING = 2,
  SHIPPING = 3,
}

export const AddressTypeMap = {
  [AddressType.REGISTER]: "Register",
  [AddressType.BILLING]: "Billing",
  [AddressType.SHIPPING]: "Shipping",
}

export enum StatusType {
  ACTIVE = 1,
  INACTIVE = 2,
}

export const StatusTypeMap = {
  [StatusType.ACTIVE]: "Active",
  [StatusType.INACTIVE]: "In-Active",
}

export enum ServisibilityStatusType {
  OPEN = 1,
  CLOSE = 2,
  TEMPORARILY_CLOSE = 3,
}

export const ServisibilityStatusTypeMap = {
  [ServisibilityStatusType.OPEN]: "Open",
  [ServisibilityStatusType.CLOSE]: "Close",
  [ServisibilityStatusType.TEMPORARILY_CLOSE]: "Temporarily Close",
}

export enum DocumentType {
  PAN = 1,
  GST = 2,
  FSSAI = 3,
}

export const DocumentMaxFileSize = 3145728 // 3MB in bytes

export enum IsDelay {
  TRUE = 1,
  FALSE = 2,
}
export const IsDelayOption = {
  [IsDelay.TRUE]: "True",
  [IsDelay.FALSE]: "False",
}
