import { MedusaRequest } from "@medusajs/framework/http"

/**
 * Agent type for device/platform identification
 */
export type AgentType = 'app' | 'web'

/**
 * Determines the agent type (app or web) ONLY from the JWT token's app_metadata.
 * 
 * This intentionally does NOT read from headers to prevent spoofing attacks.
 * Headers can be easily manipulated by clients, so we only trust the agent_type
 * that was embedded into the JWT token at login time (from req.body.agent_type).
 * 
 * The agent_type is embedded into the token during login and persists across
 * all authenticated requests. For unauthenticated requests, defaults to 'web'.
 * 
 * @param req - Medusa request object
 * @returns 'app' if agent_type is "app" in token, otherwise 'web'
 */
export function getAgentType(req: MedusaRequest): AgentType {
  const agentType: AgentType = req.headers['user-agent'] === 'app' ? 'app' : 'web'
  return agentType
  }
