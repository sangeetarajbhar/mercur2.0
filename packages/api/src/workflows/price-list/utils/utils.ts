type FormattedDate = string

export function formatDate(
  isoString: any,
  useUTC: boolean = false
): FormattedDate {
  const dateObj = new Date(isoString)

  const day = String(
    useUTC ? dateObj.getUTCDate() : dateObj.getDate()
  ).padStart(2, "0")
  const month = String(
    (useUTC ? dateObj.getUTCMonth() : dateObj.getMonth()) + 1
  ).padStart(2, "0")
  const year = useUTC ? dateObj.getUTCFullYear() : dateObj.getFullYear()

  return `${day}-${month}-${year}`
}

export function formatDateTime(
  isoString: any,
  useUTC: boolean = false
): FormattedDate {
  const dateObj = new Date(isoString)

  const day = String(
    useUTC ? dateObj.getUTCDate() : dateObj.getDate()
  ).padStart(2, "0")
  const month = String(
    (useUTC ? dateObj.getUTCMonth() : dateObj.getMonth()) + 1
  ).padStart(2, "0")
  const year = useUTC ? dateObj.getUTCFullYear() : dateObj.getFullYear()

  const hours = String(
    useUTC ? dateObj.getUTCHours() : dateObj.getHours()
  ).padStart(2, "0")
  const minutes = String(
    useUTC ? dateObj.getUTCMinutes() : dateObj.getMinutes()
  ).padStart(2, "0")
  const seconds = String(
    useUTC ? dateObj.getUTCSeconds() : dateObj.getSeconds()
  ).padStart(2, "0")

  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`
}

export function removeFileExtension(filename: string): string {
  return filename.replace(/\.[^/.]+$/, "")
}
