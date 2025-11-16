// Selection lists utility temporarily disabled.
// The original implementation relied on Prisma includes/selects that differ
// from the generated client in this workspace and caused many compile errors.
// We'll reintroduce a typesafe implementation later that's aligned with the
// project's Prisma schema. For now export a minimal stub so imports keep working.

export class SelectionListsUtil {
  static notAvailable() {
    throw new Error('Selection lists utility is temporarily disabled')
  }
}
