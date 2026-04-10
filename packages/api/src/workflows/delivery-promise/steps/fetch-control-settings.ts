// Control settings types
export type ControlSettings = {
  isInstantEnabled: boolean
  isSlottedEnabled: boolean
  delayMinutes: number
  delayMessage: string | null
  messageIcon: string | null
}

// Fetch and merge control settings
export async function fetchControlSettings(
  query: any,
  zone_id: string,
  location_id: string
): Promise<ControlSettings> {
  // Get zone control settings
  const { data: zoneControlData } = await query.graph({
    entity: 'control',
    fields: ['*'],
    filters: {
      scope: 'zone',
      scope_id: zone_id,
      is_active: true,
      deleted_at: null
    }
  })
  const zoneControl = zoneControlData?.[0] || null

  // Get location-level control
  const { data: locationControlData } = await query.graph({
    entity: 'control',
    fields: ['*'],
    filters: {
      scope: 'darkstore',
      scope_id: location_id,
      is_active: true,
      deleted_at: null
    }
  })
  const locationControl = locationControlData?.[0] || null

  return mergeControlSettings(zoneControl, locationControl)
}

// Merge control settings from zone and location
function mergeControlSettings(zoneControl: any, locationControl: any): ControlSettings {
  let isInstantEnabled: boolean
  let isSlottedEnabled: boolean
  let delayMinutes: number = 0
  let delayMessage: string | null = null
  let messageIcon: string | null = null

  if (zoneControl && locationControl) {
    isInstantEnabled = zoneControl.is_instant_enabled && locationControl.is_instant_enabled
    isSlottedEnabled = zoneControl.is_slotted_enabled && locationControl.is_slotted_enabled
    delayMinutes = (zoneControl.delay_minutes || 0) + (locationControl.delay_minutes || 0)
    delayMessage = zoneControl.delay_message || locationControl.delay_message || null
    messageIcon = zoneControl.message_icon || locationControl.message_icon || null
  } else if (zoneControl) {
    isInstantEnabled = zoneControl.is_instant_enabled ?? true
    isSlottedEnabled = zoneControl.is_slotted_enabled ?? true
    delayMinutes = zoneControl.delay_minutes ?? 0
    delayMessage = zoneControl.delay_message
    messageIcon = zoneControl.message_icon
  } else if (locationControl) {
    isInstantEnabled = locationControl.is_instant_enabled ?? true
    isSlottedEnabled = locationControl.is_slotted_enabled ?? true
    delayMinutes = locationControl.delay_minutes ?? 0
    delayMessage = locationControl.delay_message
    messageIcon = locationControl.message_icon
  } else {
    isInstantEnabled = true
    isSlottedEnabled = true
    delayMinutes = 0
    delayMessage = null
    messageIcon = null
  }

  return {
    isInstantEnabled,
    isSlottedEnabled,
    delayMinutes,
    delayMessage,
    messageIcon
  }
}

