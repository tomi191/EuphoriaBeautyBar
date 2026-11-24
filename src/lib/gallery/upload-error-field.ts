import { STAFF_UPLOAD_ERRORS as E } from "@/lib/gallery/upload-rules";

/** Къде в листа «Снимка от работата» стои грешката от сървъра: до своето поле или над бутона. */
export type UploadErrorField = "file" | "service" | "note" | "noFace" | "form";

export function uploadErrorField(error: string): UploadErrorField {
  if (error === E.notImage || error === E.tooBig || error === E.tooSmall) return "file";
  if (error === E.service) return "service";
  if (error === E.noteTooLong) return "note";
  if (error === E.noFace) return "noFace";
  return "form"; // дневният таван, чуждият час, хранилището
}

/** Текстът на Саиф, когато няма връзка (част 1.4); бутонът става «Изпрати пак». */
export const NO_CONNECTION = "Няма връзка. Снимката още не е изпратена. Опитай пак, щом има интернет.";
