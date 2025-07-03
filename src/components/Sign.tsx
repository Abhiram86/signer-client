import type { Doc } from "@/api/docs";
import PDFView from "./PDFView";
import { useEffect, useState } from "react";

export default function Sign({
  file,
  userId,
}: {
  file: File | null;
  userId: string | undefined;
}) {
  const [doc, setDoc] = useState<Doc | null>(null);

  if (!userId) return <p>Login to sign</p>;

  useEffect(() => {
    if (!file) return;
    const buildDoc = async () => {
      const arrayBuffer = await file.arrayBuffer();
      const dataArray = Array.from(new Uint8Array(arrayBuffer));
      const newDoc: Doc = {
        _id: crypto.randomUUID(),
        userId,
        fileName: file.name,
        file: {
          data: dataArray,
          contentType: file.type,
        },
        uploadTime: new Date(),
      };
      setDoc(newDoc);
    };
    buildDoc();
  }, [file, userId]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-medium">Drop your signature</h1>
      </div>
      <div>{doc && <PDFView preDoc={[doc]} />}</div>
    </div>
  );
}
