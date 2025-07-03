import { createFileRoute, redirect } from "@tanstack/react-router";
import isAuthenticated from "@/utils/isAuthenticated";
import React, { Suspense } from "react";

const PDFViewer = React.lazy(() => import("@/components/PDFView"));

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
    return {};
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <section className="p-4 max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl md:text-center font-semibold">Dashboard</h1>
      </div>
      <div>
        <Suspense
          fallback={
            <div className="text-center animate-pulse text-white">
              Loading...
            </div>
          }
        >
          <PDFViewer simpleMode />
        </Suspense>
      </div>
    </section>
  );
}
