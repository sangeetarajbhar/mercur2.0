import { model } from "@medusajs/framework/utils"
import { ResizeConfigImageSize } from "./resize-image-config"
import { ImageSize } from "./image-size"

export const ResizeConfig = model.define("config_image_resize_config", {
  id: model.id({ prefix: "r_img_config" }).primaryKey(),
  name: model.text(),
  unique_name: model.text().unique(),
  image_sizes: model.manyToMany(() => ImageSize, {
    pivotEntity: () => ResizeConfigImageSize,
  }),
})
