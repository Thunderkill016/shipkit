export {
  user,
  session,
  account,
  verification,
  profiles,
  notes,
  type Profile,
  type NewProfile,
  type NoteRow,
  type NewNote,
} from "./schema";

/**
 * DatabasePort — thin contract for future multi-adapter work.
 * v0 apps may still use Supabase client directly inside adapters/.
 */
export interface DatabasePort {
  /** Health check */
  ping(): Promise<boolean>;
}
