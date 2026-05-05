import type { CreateLocationSchemaType } from "../create/schema";
import { IsDelay } from "../create/schema";

/**
 * Maps a Medusa admin stock location (with address + metadata from your API) into
 * create-wizard form defaults. Metadata keys mirror `additional_data` on create/update.
 */
export function mapStockLocationToFormDefaults(
  loc: Record<string, unknown>
): CreateLocationSchemaType {
  const asRecord = (v: unknown): Record<string, unknown> =>
    v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  const asEntity = (v: unknown): Record<string, unknown> =>
    Array.isArray(v) ? asRecord(v[0]) : asRecord(v);
  const asList = (v: unknown): Record<string, unknown>[] => {
    if (Array.isArray(v)) return v.filter(Boolean) as Record<string, unknown>[];
    if (v && typeof v === "object") {
      const record = v as Record<string, unknown>;
      const values = Object.values(record).filter(
        (entry) => entry && typeof entry === "object"
      ) as Record<string, unknown>[];
      if (values.length) {
        return values;
      }
      return [record];
    }
    return [];
  };
  const deepPick = (root: unknown, keys: string[]) => {
    const target = new Set(keys);
    const stack: unknown[] = [root];
    const seen = new Set<unknown>();

    while (stack.length) {
      const current = stack.pop();
      if (!current || typeof current !== "object" || seen.has(current)) {
        continue;
      }
      seen.add(current);

      if (Array.isArray(current)) {
        current.forEach((item) => stack.push(item));
        continue;
      }

      const rec = current as Record<string, unknown>;
      for (const [key, value] of Object.entries(rec)) {
        if (
          target.has(key) &&
          value !== undefined &&
          value !== null &&
          value !== ""
        ) {
          return value;
        }
        if (value && typeof value === "object") {
          stack.push(value);
        }
      }
    }

    return undefined;
  };

  const collectDocumentCandidates = (root: unknown) => {
    const stack: unknown[] = [root];
    const seen = new Set<unknown>();
    const result: Record<string, unknown>[] = [];

    while (stack.length) {
      const current = stack.pop();
      if (!current || typeof current !== "object" || seen.has(current)) {
        continue;
      }
      seen.add(current);

      if (Array.isArray(current)) {
        current.forEach((item) => stack.push(item));
        continue;
      }

      const rec = current as Record<string, unknown>;
      const hasDocHints =
        rec.document_type !== undefined ||
        rec.documentType !== undefined ||
        rec.doc_type !== undefined ||
        rec.document_number !== undefined ||
        rec.documentNumber !== undefined ||
        rec.pdf_url !== undefined ||
        rec.pdfUrl !== undefined;

      if (hasDocHints) {
        result.push(rec);
      }

      Object.values(rec).forEach((value) => {
        if (value && typeof value === "object") {
          stack.push(value);
        }
      });
    }

    return result;
  };

  const address = (loc.address || {}) as Record<string, string>;
  const metadata = asRecord(loc.metadata);
  const additionalData = asRecord(loc.additional_data);
  const nestedMetadataAdditional = asRecord(metadata.additional_data);
  const nestedMetadataAdditionalCamel = asRecord(metadata.additionalData);
  const nestedAdditionalData = asRecord(additionalData.additional_data);
  const nestedAdditionalDataCamel = asRecord(additionalData.additionalData);
  const extension = asEntity(
    loc.stock_location_extension ??
      loc.stockLocationExtension ??
      loc.stock_location_extensions ??
      loc.stockLocationExtensions
  );
  const section = asEntity(
    loc.stock_location_section ??
      loc.stockLocationSection ??
      loc.stock_location_sections ??
      loc.stockLocationSections
  );
  const contact = asEntity(
    section.stock_location_contact ?? section.stockLocationContact
  );
  const seller = asEntity(loc.seller);
  const documents = asList(
    section.stock_location_documents ??
      section.stockLocationDocuments ??
      section.stock_location_document ??
      section.stockLocationDocument ??
      loc.stock_location_documents ??
      loc.stockLocationDocuments
  )
    .map((doc) =>
      asEntity(
        doc.stock_location_document ??
          doc.stockLocationDocument ??
          doc.document ??
          doc
      )
    )
    .filter((doc) => Object.keys(doc).length > 0);
  const deepDocuments = collectDocumentCandidates(loc);

  const normalizeDocType = (doc: Record<string, unknown>) =>
    String(
      doc.document_type ?? doc.documentType ?? doc.type ?? doc.doc_type ?? ""
    )
      .trim()
      .toUpperCase();

  const allDocuments = [...documents, ...deepDocuments];
  const byDocumentType = (type: number, label: string) =>
    allDocuments.find((doc) => {
      const docTypeRaw =
        doc.document_type ?? doc.documentType ?? doc.type ?? doc.doc_type;
      const docType = normalizeDocType(doc);
      return (
        docTypeRaw === type ||
        String(docTypeRaw) === String(type) ||
        docType === label ||
        docType.includes(label)
      );
    });

  const panDoc = byDocumentType(1, "PAN");
  const gstDoc = byDocumentType(2, "GST");
  const fssaiDoc = byDocumentType(3, "FSSAI");
  const docNumber = (doc?: Record<string, unknown>) =>
    doc?.document_number ?? doc?.documentNumber ?? doc?.number ?? "";
  const docFile = (doc?: Record<string, unknown>) =>
    doc?.pdf_url ??
    doc?.pdfUrl ??
    doc?.url ??
    doc?.file_url ??
    doc?.fileUrl ??
    doc?.path ??
    "";

  const sources: Record<string, unknown>[] = [
    extension,
    section,
    contact,
    seller,
    additionalData,
    nestedAdditionalData,
    nestedAdditionalDataCamel,
    metadata,
    nestedMetadataAdditional,
    nestedMetadataAdditionalCamel,
    loc,
  ];

  const pick = (...keys: string[]) => {
    for (const key of keys) {
      for (const source of sources) {
        const value = source[key];
        if (value !== undefined && value !== null && value !== "") {
          return value;
        }
      }
    }
    return undefined;
  };
  const pickDocValue = (...keys: string[]) => {
    const value = pick(...keys);
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
    return deepPick(loc, keys);
  };

  const str = (v: unknown) => (v == null || v === "" ? "" : String(v));
  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const docs = (v: unknown): CreateLocationSchemaType["pan_pdf"] => {
    const fromUrl = (url: string) => {
      const clean = url.split("?")[0];
      const fallbackName = "document.pdf";
      const name = clean.split("/").filter(Boolean).pop() || fallbackName;
      return {
        id: `existing-${name}`,
        url,
        // Existing files are URL-only in edit mode; this shape keeps StepThree preview working.
        file: { name },
      } as unknown as CreateLocationSchemaType["pan_pdf"][number];
    };

    const normalizeOne = (item: unknown) => {
      if (typeof item === "string" && item) {
        return fromUrl(item);
      }
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        if (record.file) {
          return item as CreateLocationSchemaType["pan_pdf"][number];
        }
        const url =
          (record.url as string | undefined) ||
          (record.pdf_url as string | undefined) ||
          (record.pdfUrl as string | undefined);
        if (url) {
          return fromUrl(url);
        }
      }
      return undefined;
    };

    if (v == null) return [];
    if (Array.isArray(v)) {
      return v
        .map((item) => normalizeOne(item))
        .filter(Boolean) as CreateLocationSchemaType["pan_pdf"];
    }
    if (typeof v === "string" && v) {
      return [fromUrl(v)] as CreateLocationSchemaType["pan_pdf"];
    }
    const single = normalizeOne(v);
    if (single) {
      return [single] as CreateLocationSchemaType["pan_pdf"];
    }
    return [];
  };

  return {
    name: str(loc.name),
    address: {
      address_1: str(address.address_1),
      address_2: str(address.address_2),
      city: str(address.city),
      company: str(address.company),
      country_code: str(address.country_code),
      phone: str(address.phone),
      postal_code: str(address.postal_code),
      province: str(address.province),
    },
    seller_id: str(pick("seller_id", "sellerId") ?? seller.id),
    return_location_id: str(pick("return_location_id", "returnLocationId")),
    latitude: str(pick("latitude")),
    longitude: str(pick("longitude", "langitude", "longitute")),
    status: num(pick("status")),
    servisibility_status: num(
      pick("servisibility_status", "serviceability_status", "servisibilityStatus", "serviceabilityStatus")
    ),
    start_time: str(pick("start_time", "startTime")),
    end_time: str(pick("end_time", "endTime")),
    partner_id: str(pick("partner_id", "partnerId")),
    location_type: num(pick("location_type", "locationType")),
    address_type: num(pick("address_type", "addressType")),
    partner_wh_code: str(pick("partner_wh_code", "partnerWhCode")),
    lead_time: str(pick("lead_time", "leadTime")),
    managed_by: str(pick("managed_by", "managedBy")),
    first_name: str(pick("first_name", "firstName")),
    last_name: str(pick("last_name", "lastName")),
    email: str(pick("email")),
    is_delay: num(pick("is_delay", "isDelay")) || IsDelay.FALSE,
    delay_value: str(pick("delay_value", "delayValue")),
    delay_message: str(pick("delay_message", "delayMessage")),
    pan_number: str(
      pick("pan_number", "panNumber", "document_number", "documentNumber") ??
        deepPick(loc, ["pan_number", "panNumber", "panNo", "pan"]) ??
        docNumber(panDoc)
    ),
    pan_pdf: docs(
      pickDocValue("pan_pdf", "panPdf", "pan_pdf_url", "panPdfUrl", "pan_file_url", "panFileUrl") ??
        docFile(panDoc)
    ),
    gst_number: str(
      pick("gst_number", "gstNumber", "document_number", "documentNumber") ??
        deepPick(loc, ["gst_number", "gstNumber", "gstNo", "gst"]) ??
        docNumber(gstDoc)
    ),
    gst_pdf: docs(
      pickDocValue("gst_pdf", "gstPdf", "gst_pdf_url", "gstPdfUrl", "gst_file_url", "gstFileUrl") ??
        docFile(gstDoc)
    ),
    fssai_number: str(
      pick("fssai_number", "fssaiNumber", "document_number", "documentNumber") ??
        deepPick(loc, ["fssai_number", "fssaiNumber", "fssaiNo", "fssai"]) ??
        docNumber(fssaiDoc)
    ),
    fssai_pdf: docs(
      pickDocValue(
        "fssai_pdf",
        "fssaiPdf",
        "fssai_pdf_url",
        "fssaiPdfUrl",
        "fssai_file_url",
        "fssaiFileUrl"
      ) ?? docFile(fssaiDoc)
    ),
    stock_location_extension_id: str(extension.id),
    stock_location_section_id: str(section.id),
    stock_location_contact_id: str(contact.id),
  };
}
