"use client";
import { Suspense } from "react";
import dynamicImport from "next/dynamic";

const AskContent = dynamicImport(() => import("./AskContent"), {
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