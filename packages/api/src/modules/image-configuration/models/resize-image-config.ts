import { model } from "@medusajs/framework/utils"
import { ResizeConfig } from "./resize-config"
import { ImageSize } from "./image-size"

export const ResizeConfigImageSize = model.define(
  "config_image_resize_config_image_size",
  {
    id: model.id().primaryKey(),
    resize_config: model.belongsTo(() => ResizeConfig, {
      mappedBy: "image_sizes",
    }),
    image_size: model.belongsTo(() => ImageSize, {
      mappedBy: "resize_configs",
    }),
  }
)
