import { Request, Response, NextFunction } from 'express'

// asyncHandler wraps an async Express route handler so that any
// rejected Promise is automatically forwarded to Express's error handler
// via next(error), instead of causing an unhandled rejection crash.
//
// Without this, you'd write try/catch in every controller:
//   app.get('/x', async (req, res, next) => {
//     try { ... } catch (e) { next(e) }
//   })
//
// With asyncHandler:
//   app.get('/x', asyncHandler(async (req, res) => { ... }))
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
