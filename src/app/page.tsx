import SearchBox from "@/components/SearchBox";

export default function Home() {
  return (
    <div className="min-h-screen px-6 py-20 sm:px-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-semibold text-center">AIseach</h1>
        <SearchBox />
      </div>
    </div>
  );
}
