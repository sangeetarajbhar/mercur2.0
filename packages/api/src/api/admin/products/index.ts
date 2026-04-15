import { Router } from "express";
import clone from "./clone";
import cloneCatalog from "./clone-catalog";
import { POST as linkCatalog } from "./link-catalog/route";
import { POST as bulkClone } from "./bulk-clone/route";
import { GET as getBulkCloneStatus } from "./bulk-clone/[job_id]/status/route";

// Simple wrapper function to handle async route handlers
const wrapHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    next(error);
  }
};

const router = Router();

export default (adminRouter: Router) => {
  adminRouter.use("/products", router);

  // Clone a single product
  router.post("/clone", wrapHandler(clone));

  // Clone a catalog of products
  router.post("/clone-catalog", wrapHandler(cloneCatalog));

  // Link products to target seller using workflow approach
  router.post("/link-catalog", wrapHandler(linkCatalog));
  
  // Bulk clone products with job-based approach
  router.post("/bulk-clone", wrapHandler(bulkClone));
  router.get("/bulk-clone/:job_id/status", wrapHandler(getBulkCloneStatus));

  return router;
};
