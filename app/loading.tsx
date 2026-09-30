export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070b1a]">
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-12 w-12 animate-spin rounded-full border-4 border-[#1a1f3a] border-t-[#4f6ef6]"
          role="status"
          aria-label="Loading"
        />
        <p className="text-sm text-[#7b80a0]">Loading...</p>
      </div>
    </div>
  );
}
