import { NextFunction } from 'express'

import {
  AuthType,
  MedusaRequest,
  MedusaResponse,
} from '@medusajs/framework'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function checkSellerApproved(_authTypes: AuthType[]) {
  return async (
    req: MedusaRequest,
    res: MedusaResponse,
    next: NextFunction
  ) => {
    // auth_context is set by the authenticate() middleware (bearer/session).
    // Cast to any since MedusaRequest doesn't expose it but it is present at runtime.
    const ctx = (req as any).auth_context

    if (!ctx) {
      return res.status(401).json({
        message: 'Unauthorized'
      })
    }

    if (ctx.actor_id) {
      return next()
    }

    res.status(403).json({
      message: 'Seller is not active'
    })
  }
}
