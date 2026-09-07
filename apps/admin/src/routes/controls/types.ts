export interface Control {
    id: string
    scope: 'zone' | 'darkstore'
    scope_id: string
    scope_name?: string | null
    message_icon?: string | null
    message_icon_url?: string | null
    is_active: boolean
    is_instant_enabled: boolean
    is_slotted_enabled: boolean
    delay_minutes: number
    delay_message: string | null
    reason: Record<string, unknown> | null
    created_by: string | null
    updated_by: string | null
    created_at: Date
    updated_at: Date
  }
  
  export type ControlsResponse = {
    controls?: Control[],
    isLoading: boolean
  }
  