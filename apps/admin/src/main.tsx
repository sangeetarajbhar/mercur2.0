import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@mercurjs/admin/index.css";
import App from "@mercurjs/admin";
import { PRODUCT_DETAIL_QUERY } from "@mercurjs/admin/pages";

// Frontend override: keep original detail page UI, only adjust requested fields.
(PRODUCT_DETAIL_QUERY as { fields: string }).fields =
  "*sellers,*categories,*shipping_profile,-variants";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
