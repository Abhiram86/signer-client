import { type Doc } from "@/api/docs";
import { useEffect, useState, useCallback } from "react";
import packageJson from "../../package.json";
import PDF from "./PDF";
import type {
  DocumentLoadEvent,
  PageChangeEvent,
} from "@react-pdf-viewer/core";
import { Button } from "./Button";
import { signFile } from "@/api/sign";

interface PageTracker {
  docId: string;
  currentPage: number;
  totalPages: number;
  mouseX: number;
  mouseY: number;
  pageX: number;
  pageY: number;
}

export interface SignaturePosition {
  x: number; // relative position (0-1)
  y: number; // relative position (0-1)
  page: number;
  docId: string;
  width: number; // signature width in relative units (0-1)
  height: number; // signature height in relative units (0-1)
}

interface ProcessedDoc extends Doc {
  base64?: string;
  isProcessing?: boolean;
  error?: string;
}

interface PDFViewProps {
  docs: Doc[];
  simpleMode?: boolean;
}

export default function PDFView({
  docs: propDocs,
  simpleMode = false,
}: PDFViewProps) {
  // const { user } = useContext(AuthContext);
  const [docs, setDocs] = useState<ProcessedDoc[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageTrackers, setPageTrackers] = useState<Record<string, PageTracker>>(
    {}
  );
  const [signatures, setSignatures] = useState<SignaturePosition[]>([]);
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [defaultSignatureSize, setDefaultSignatureSize] = useState({
    width: 0.15,
    height: 0.08,
  });

  const pdfjsVersion = packageJson.dependencies["pdfjs-dist"].replace(
    /^\^/,
    ""
  );

  const arrayBufferToBase64 = useCallback(
    (buffer: { data: number[] } | number[]): string => {
      // This part is fine for base64 conversion
      const dataArray = Array.isArray(buffer) ? buffer : buffer.data;
      const byteArray = new Uint8Array(dataArray);
      let binary = "";
      for (let i = 0; i < byteArray.length; i++) {
        binary += String.fromCharCode(byteArray[i]);
      }
      return btoa(binary);
    },
    []
  );

  const processDocument = useCallback(
    async (doc: Doc): Promise<ProcessedDoc> => {
      try {
        setDocs((prev) =>
          prev
            ? prev.map((d) =>
                d._id === doc._id ? { ...d, isProcessing: true } : d
              )
            : null
        );

        const base64 = arrayBufferToBase64(doc.file.data);

        const processedDoc: ProcessedDoc = {
          ...doc,
          base64,
          isProcessing: false,
        };

        setDocs((prev) =>
          prev ? prev.map((d) => (d._id === doc._id ? processedDoc : d)) : null
        );

        return processedDoc;
      } catch (error) {
        console.error(`Error processing document ${doc._id}:`, error);
        const errorDoc: ProcessedDoc = {
          ...doc,
          isProcessing: false,
          error: error instanceof Error ? error.message : "Processing failed",
        };

        setDocs((prev) =>
          prev ? prev.map((d) => (d._id === doc._id ? errorDoc : d)) : null
        );

        return errorDoc;
      }
    },
    [arrayBufferToBase64]
  );

  useEffect(() => {
    if (!propDocs || propDocs.length === 0) {
      setDocs([]);
      setIsLoading(false);
      return;
    }

    const fetchAndProcessDocs = async () => {
      setIsLoading(true);

      const processedDocs: ProcessedDoc[] = propDocs.map((doc) => ({
        ...doc,
        isProcessing: false,
      }));
      setDocs(processedDocs);

      const processingPromises = propDocs.map((doc) => processDocument(doc));
      await Promise.allSettled(processingPromises);
      setIsLoading(false);
    };

    fetchAndProcessDocs();
  }, [propDocs, processDocument]);

  const handlePageChange = useCallback(
    (docId: string) => (e: PageChangeEvent) => {
      if (simpleMode) return;

      setPageTrackers((prev) => ({
        ...prev,
        [docId]: {
          ...prev[docId],
          currentPage: e.currentPage + 1,
        },
      }));
      console.log(`Document ${docId} - Page changed to: ${e.currentPage + 1}`);
    },
    [simpleMode]
  );

  const handleDocumentLoad = useCallback(
    (docId: string) => (e: DocumentLoadEvent) => {
      setPageTrackers((prev) => ({
        ...prev,
        [docId]: {
          ...prev[docId],
          docId,
          currentPage: 1,
          totalPages: e.doc.numPages,
          mouseX: 0,
          mouseY: 0,
          pageX: 0,
          pageY: 0,
        },
      }));
      console.log(`Document ${docId} loaded - Total pages: ${e.doc.numPages}`);
    },
    []
  );

  // Updated mouse move handler that gets PDF-specific coordinates
  const handleMouseMove = useCallback(
    (docId: string) =>
      (pdfX: number, pdfY: number, pageX: number, pageY: number) => {
        if (simpleMode) return;

        setPageTrackers((prev) => ({
          ...prev,
          [docId]: {
            ...prev[docId],
            mouseX: pdfX,
            mouseY: pdfY,
            pageX,
            pageY,
          },
        }));
      },
    [simpleMode]
  );

  const handleClick = useCallback(
    (docId: string) =>
      (pdfX: number, pdfY: number, pageX: number, pageY: number) => {
        if (simpleMode) return;

        const tracker = pageTrackers[docId];
        if (tracker) {
          console.log(`Clicked on document ${docId}:`, {
            page: tracker.currentPage,
            coordinates: {
              absolute: { x: pdfX, y: pdfY },
              relative: { x: pageX, y: pageY },
            },
          });
        }
      },
    [pageTrackers, simpleMode]
  );

  // Add signature at clicked position
  const handleAddSignature = useCallback(
    (docId: string) => (pageX: number, pageY: number, page: number) => {
      if (simpleMode || !signatureImage) return;

      // Invert the Y coordinate to match PDF coordinate system
      const invertedPageY = 1 - pageY;

      const adjustedX = Math.max(
        0,
        Math.min(
          1 - defaultSignatureSize.width,
          pageX - defaultSignatureSize.width / 2
        )
      );
      const adjustedY = Math.max(
        0,
        Math.min(
          1 - defaultSignatureSize.height,
          invertedPageY - defaultSignatureSize.height / 2
        )
      );

      const newSignature: SignaturePosition = {
        x: adjustedX,
        y: adjustedY,
        page: page,
        docId,
        width: defaultSignatureSize.width,
        height: defaultSignatureSize.height,
      };
      setSignatures((prev) => [...prev, newSignature]);
      console.log("Added signature at:", newSignature);
    },
    [simpleMode, signatureImage, defaultSignatureSize]
  );

  // Handle signature drag
  const handleSignatureDrag = useCallback(
    (index: number, newX: number, newY: number) => {
      setSignatures((prev) =>
        prev.map((sig, i) => {
          if (i === index) {
            // FIX: Ensure signature stays within page bounds considering its dimensions
            const boundedX = Math.max(0, Math.min(1 - sig.width, newX));
            const boundedY = Math.max(0, Math.min(1 - sig.height, newY));

            return {
              ...sig,
              x: boundedX,
              y: boundedY,
            };
          }
          return sig;
        })
      );
    },
    []
  );

  // Handle signature resize
  const handleSignatureResize = useCallback(
    (index: number, newWidth: number, newHeight: number) => {
      setSignatures((prev) =>
        prev.map((sig, i) => {
          if (i === index) {
            // FIX: Ensure resized signature doesn't exceed page bounds
            const maxWidth = Math.min(0.5, 1 - sig.x); // Max 50% of page width or remaining space
            const maxHeight = Math.min(0.3, 1 - sig.y); // Max 30% of page height or remaining space

            const boundedWidth = Math.max(0.05, Math.min(maxWidth, newWidth));
            const boundedHeight = Math.max(
              0.03,
              Math.min(maxHeight, newHeight)
            );

            return {
              ...sig,
              width: boundedWidth,
              height: boundedHeight,
            };
          }
          return sig;
        })
      );
    },
    []
  );

  // Handle signature image upload
  const handleSignatureUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          setSignatureImage(result);
        };
        reader.readAsDataURL(file);
      }
    },
    []
  );

  // Remove signature
  const handleRemoveSignature = useCallback((index: number) => {
    setSignatures((prev) => prev.filter((_, i) => i !== index));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-400 mx-auto mb-2"></div>
          <div className="text-zinc-400">Loading documents...</div>
        </div>
      </div>
    );
  }

  if (!docs || docs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">No documents found</div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!signatureImage || signatures.length === 0) {
      alert("Please upload a signature image and add at least one signature.");
      return;
    }

    try {
      for (const doc of docs) {
        const relatedSignatures = signatures.filter(
          (sig) => sig.docId === doc._id
        );

        for (const sig of relatedSignatures) {
          const formData = new FormData();

          // FIX 1: Properly handle the PDF data
          let pdfBlob: Blob;

          if (doc.file.data instanceof Uint8Array) {
            // If it's already a Uint8Array, use it directly
            pdfBlob = new Blob([doc.file.data], { type: "application/pdf" });
          } else if (Array.isArray(doc.file.data)) {
            // If it's an array, convert to Uint8Array
            pdfBlob = new Blob([new Uint8Array(doc.file.data)], {
              type: "application/pdf",
            });
          } else if (doc.base64) {
            // If we have base64, convert back to binary
            const binaryString = atob(doc.base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            pdfBlob = new Blob([bytes], { type: "application/pdf" });
          } else {
            console.error("Invalid PDF data format for doc:", doc._id);
            continue;
          }

          // FIX 2: Convert base64 image to Blob properly
          const imageBlob = await fetch(signatureImage).then((res) =>
            res.blob()
          );

          formData.append("pdf", pdfBlob, doc.fileName || "document.pdf");
          formData.append("signature", imageBlob, "signature.png");
          formData.append("userId", doc.userId);
          formData.append("page", sig.page.toString());
          formData.append("x", sig.x.toString());
          formData.append("y", sig.y.toString());
          formData.append("width", sig.width.toString());
          formData.append("height", sig.height.toString());
          formData.append("docId", doc._id);

          const result = await signFile({ formdata: formData });
          if (result.error) {
            console.error("Error signing document:", result.error);
            alert(`Error signing document: ${result.error}`);
            return;
          }
        }
      }

      alert("Documents signed successfully!");
      // Optionally refresh the documents or redirect
    } catch (error) {
      console.error("Error in submit handler:", error);
      alert("An error occurred while signing the documents.");
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={`flex ${simpleMode ? "flex-wrap" : "flex-col"} gap-8 justify-center`}
      >
        {/* Signature Controls */}
        {!simpleMode && (
          <div className="bg-zinc-800 p-4 rounded-lg">
            <h3 className="text-zinc-100 font-medium mb-3">
              Signature Controls
            </h3>

            {/* Signature Upload */}
            <div className="mb-4">
              <label className="block text-zinc-300 text-sm mb-2">
                Upload Signature Image:
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleSignatureUpload}
                className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-zinc-700 file:text-zinc-100 hover:file:bg-zinc-600"
              />
              {signatureImage && (
                <div className="mt-2 flex items-center gap-2">
                  <img
                    src={signatureImage}
                    alt="Signature preview"
                    className="h-8 bg-white rounded px-2"
                  />
                  <span className="text-green-400 text-xs">
                    ✓ Signature loaded
                  </span>
                </div>
              )}
            </div>

            {/* Size Controls */}
            {signatureImage && (
              <div className="mb-4">
                <label className="block text-zinc-300 text-sm mb-2">
                  Default Signature Size:
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-400">Width:</label>
                    <input
                      type="range"
                      min="0.05"
                      max="0.3"
                      step="0.01"
                      value={defaultSignatureSize.width}
                      onChange={(e) =>
                        setDefaultSignatureSize((prev) => ({
                          ...prev,
                          width: parseFloat(e.target.value),
                        }))
                      }
                      className="w-20"
                    />
                    <span className="text-xs text-zinc-400 w-12">
                      {Math.round(defaultSignatureSize.width * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-400">Height:</label>
                    <input
                      type="range"
                      min="0.03"
                      max="0.2"
                      step="0.01"
                      value={defaultSignatureSize.height}
                      onChange={(e) =>
                        setDefaultSignatureSize((prev) => ({
                          ...prev,
                          height: parseFloat(e.target.value),
                        }))
                      }
                      className="w-20"
                    />
                    <span className="text-xs text-zinc-400 w-12">
                      {Math.round(defaultSignatureSize.height * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-4">
              <button
                onClick={() => setSignatures([])}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                disabled={signatures.length === 0}
              >
                Clear All Signatures
              </button>
              <button
                onClick={() => setSignatureImage(null)}
                className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                disabled={!signatureImage}
              >
                Remove Signature Image
              </button>
              <span className="text-zinc-400 text-sm">
                {signatureImage
                  ? "Double-click on PDF to add signature"
                  : "Upload a signature image first"}
              </span>
            </div>
            {signatures.length > 0 && (
              <div className="mt-2 text-xs text-zinc-400">
                Active signatures: {signatures.length}
              </div>
            )}
          </div>
        )}

        {docs.map((doc) => (
          <PDF
            key={doc._id}
            doc={doc}
            pdfjsVersion={pdfjsVersion}
            pageTracker={pageTrackers[doc._id]}
            onPageChange={handlePageChange(doc._id)}
            onDocumentLoad={handleDocumentLoad(doc._id)}
            onMouseMove={handleMouseMove(doc._id)}
            onClick={handleClick(doc._id)}
            onAddSignature={handleAddSignature(doc._id)}
            signatures={signatures.filter((sig) => sig.docId === doc._id)}
            onSignatureDrag={handleSignatureDrag}
            onRemoveSignature={handleRemoveSignature}
            onSignatureResize={handleSignatureResize}
            signatureImage={signatureImage}
            simpleMode={simpleMode}
          />
        ))}
      </div>
      {!simpleMode && (
        <div>
          <Button type="submit" onClick={handleSubmit} className="rounded-lg">
            Submit
          </Button>
        </div>
      )}
    </div>
  );
}
