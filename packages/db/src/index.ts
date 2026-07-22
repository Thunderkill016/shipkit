export {
  profiles,
  notes,
  productRecords,
  type Profile,
  type NewProfile,
  type NoteRow,
  type NewNote,
  type ProductRecordRow,
  type NewProductRecord,
} from "./schema";

/**
 * DatabasePort — thin contract for future multi-adapter work.
 * v0 apps may still use Supabase client directly inside adapters/.
 */
export interface DatabasePort {
  /** Health check */
  ping(): Promise<boolean>;
}
