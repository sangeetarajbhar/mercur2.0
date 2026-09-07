import { Module } from "@medusajs/framework/utils"
import GoogleLocationService from "./services/google-location"

export const GOOGLE_LOCATION_MODULE = "google_location"

export default Module(GOOGLE_LOCATION_MODULE, {
  service: GoogleLocationService,
})
