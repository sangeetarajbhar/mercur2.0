import { model } from "@medusajs/framework/utils"
import { ResizeConfig } from "./resize-config"

export const ImageSize = model.define("config_image_size", {
  id: model.id({ prefix: "r_img_size" }).primaryKey(),
  name: model.text().unique(),
  width: model.number(),
  height: model.number(),
  resize_configs: model.manyToMany(() => ResizeConfig),
})
