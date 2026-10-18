import { NotesClient } from "./NotesClient";

// Read ?view= on the server and pass it down, instead of useSearchParams + Suspense on the
// client (that left a hidden second copy of the journal in the page after a reload).
export default async function NotesPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  return <NotesClient view={view === "journal" ? "journal" : "notes"} />;
}
