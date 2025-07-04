import { createFileRoute, redirect } from "@tanstack/react-router";
import isAuthenticated from "@/utils/isAuthenticated";
import React, { Suspense, useContext, useEffect, useState } from "react";
import { getFiles, type Doc } from "@/api/docs";
import { AuthContext } from "@/context/AuthProvider";

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
  const { user } = useContext(AuthContext);
  const [data, setData] = useState<Doc[]>([]);
  useEffect(() => {
    if (!user) return;
    const fetchDocs = async () => {
      const res = await getFiles(user.userId);
      if (res.docs) {
        console.log("res is ", res);

        setData(res.docs);
      }
    };
    fetchDocs();
  }, [user]);
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
          <PDFViewer docs={data} simpleMode />
        </Suspense>
      </div>
    </section>
  );
}
