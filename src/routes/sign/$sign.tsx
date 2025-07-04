import { getFile } from "@/api/docs";
import PDFView from "@/components/PDFView";
import isAuthenticated from "@/utils/isAuthenticated";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/sign/$sign")({
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
    return {};
  },
  loader: async ({ params }) => {
    const res = await getFile(params.sign);
    return res;
  },
  component: RouteComponent,
});

function RouteComponent() {
  const data = Route.useLoaderData();
  console.log(data);

  if (data.error)
    return (
      <div className="mt-4 text-center">
        <p>{data.error}</p>
      </div>
    );

  return (
    <div>
      <div className="p-4">{data.doc && <PDFView docs={[data.doc]} />}</div>
    </div>
  );
}
