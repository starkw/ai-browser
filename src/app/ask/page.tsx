import { Suspense } from "react";
import dynamic from "next/dynamic";

export const dynamic = 'force-dynamic';

const AskContent = dynamic(() => import("./AskContent"), {
  ssr: false,
  loading: () => <div className="h-screen flex items-center justify-center">加载中...</div>
});

export default function AskPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">加载中...</div>}>
      <AskContent />
    </Suspense>
  );
}