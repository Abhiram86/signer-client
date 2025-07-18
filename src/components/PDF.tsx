import {
  Worker,
  Viewer,
  SpecialZoomLevel,
  ScrollMode,
} from "@react-pdf-viewer/core";
import type {
  PageChangeEvent,
  DocumentLoadEvent,
} from "@react-pdf-viewer/core";
import { pageNavigationPlugin } from "@react-pdf-viewer/page-navigation";
import { scrollModePlugin } from "@react-pdf-viewer/scroll-mode";
import { zoomPlugin } from "@react-pdf-viewer/zoom";
import { useRef, useCallback, useState } from "react";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/page-navigation/lib/styles/index.css";
import "@react-pdf-viewer/zoom/lib/styles/index.css";
import type { Doc } from "@/api/docs";
import Modal from "./Modal";

interface ProcessedDoc extends Doc {
  base64?: string;
  isProcessing?: boolean;
  error?: string;
}

interface PageTracker {
  docId: string;
  currentPage: number;
  totalPages: number;
  mouseX: number;
  mouseY: number;
  pageX: number;
  pageY: number;
}

interface SignaturePosition {
  x: number;
  y: number;
  page: number;
  docId: string;
  width: number;
  height: number;
}

interface PDFProps {
  doc: ProcessedDoc;
  pdfjsVersion: string;
  pageTracker: PageTracker;
  onPageChange: (e: PageChangeEvent) => void;
  onDocumentLoad: (e: DocumentLoadEvent) => void;
  onMouseMove: (
    pdfX: number,
    pdfY: number,
    pageX: number,
    pageY: number
  ) => void;
  onClick: (pdfX: number, pdfY: number, pageX: number, pageY: number) => void;
  onAddSignature: (pageX: number, pageY: number, page: number) => void;
  signatures: SignaturePosition[];
  onSignatureDrag: (index: number, newX: number, newY: number) => void;
  onRemoveSignature: (index: number) => void;
  onSignatureResize: (
    index: number,
    newWidth: number,
    newHeight: number
  ) => void;
  signatureImage: string | null;
  simpleMode?: boolean;
}

export default function PDF({
  doc,
  pdfjsVersion,
  pageTracker,
  onPageChange,
  onDocumentLoad,
  onMouseMove,
  onClick,
  onAddSignature,
  signatures,
  onSignatureDrag,
  onRemoveSignature,
  onSignatureResize,
  signatureImage,
  simpleMode = false,
}: PDFProps) {
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const [draggedSignature, setDraggedSignature] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizingSignature, setResizingSignature] = useState<number | null>(
    null
  );
  const [resizeHandle, setResizeHandle] = useState<
    "se" | "sw" | "ne" | "nw" | null
  >(null);
  const [openModal, setOpenModal] = useState(false);

  const pageNavigationPluginInstance = pageNavigationPlugin();
  const scrollModePluginInstance = scrollModePlugin();
  const zoomPluginInstance = zoomPlugin();

  const { CurrentPageInput, GoToNextPage, GoToPreviousPage } =
    pageNavigationPluginInstance;
  const { ZoomIn, ZoomOut, Zoom } = zoomPluginInstance;

  const isProcessing = doc.isProcessing;
  const hasError = doc.error;
  const isReady = doc.base64 && !isProcessing && !hasError;
  const tracker = pageTracker;

  const viewerHeight = simpleMode ? "h-[400px] w-[400px]" : "h-[1200px] w-full";

  // Get PDF-specific coordinates from mouse event
  const getPdfCoordinates = useCallback((e: React.MouseEvent) => {
    if (!pdfContainerRef.current) return null;

    const container = pdfContainerRef.current;
    // const rect = container.getBoundingClientRect();

    // Find the actual PDF page element within the container
    const pdfPage = container.querySelector(".rpv-core__page-layer");
    if (!pdfPage) return null;

    const pageRect = pdfPage.getBoundingClientRect();

    // Calculate mouse position relative to the PDF page (not the container)
    const pdfX = e.clientX - pageRect.left;
    const pdfY = e.clientY - pageRect.top;

    // Calculate relative position within the PDF page (0-1 range)
    const pageX = Math.max(0, Math.min(1, pdfX / pageRect.width));
    const pageY = Math.max(0, Math.min(1, pdfY / pageRect.height));

    // Only return coordinates if mouse is within the PDF page bounds
    if (
      pdfX >= 0 &&
      pdfX <= pageRect.width &&
      pdfY >= 0 &&
      pdfY <= pageRect.height
    ) {
      return { pdfX, pdfY, pageX, pageY };
    }

    return null;
  }, []);

  const getSignatureBounds = useCallback((signature: SignaturePosition) => {
    const actualX = Math.max(0, Math.min(1 - signature.width, signature.x));
    const actualY = Math.max(0, Math.min(1 - signature.height, signature.y));

    return { x: actualX, y: actualY };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (simpleMode) return;

      const coords = getPdfCoordinates(e);
      if (coords) {
        onMouseMove(coords.pdfX, coords.pdfY, coords.pageX, coords.pageY);
      }

      // Handle signature dragging
      if (draggedSignature !== null && coords) {
        const newX = coords.pageX - dragOffset.x;
        const newY = coords.pageY - dragOffset.y;
        onSignatureDrag(draggedSignature, newX, newY);
      }

      // Handle signature resizing
      if (resizingSignature !== null && coords && resizeHandle) {
        const sig = signatures[resizingSignature];
        const { x, y, width, height } = sig;

        let newX = x;
        let newY = y;
        let newWidth = width;
        let newHeight = height;

        switch (resizeHandle) {
          case "se": // bottom-right
            newWidth = Math.max(0.05, coords.pageX - x);
            newHeight = Math.max(0.03, coords.pageY - y);
            break;

          case "sw": // bottom-left
            newX = Math.min(x + width - 0.05, coords.pageX);
            newWidth = Math.max(0.05, x + width - coords.pageX);
            newHeight = Math.max(0.03, coords.pageY - y);
            break;

          case "ne": // top-right
            newY = Math.min(y + height - 0.03, coords.pageY);
            newWidth = Math.max(0.05, coords.pageX - x);
            newHeight = Math.max(0.03, y + height - coords.pageY);
            break;

          case "nw": // top-left
            newX = Math.min(x + width - 0.05, coords.pageX);
            newY = Math.min(y + height - 0.03, coords.pageY);
            newWidth = Math.max(0.05, x + width - coords.pageX);
            newHeight = Math.max(0.03, y + height - coords.pageY);
            break;
        }

        // Ensure the signature stays within bounds
        if (newX < 0) {
          newWidth += newX; // Reduce width by how much we went negative
          newX = 0;
        }
        if (newY < 0) {
          newHeight += newY; // Reduce height by how much we went negative
          newY = 0;
        }
        if (newX + newWidth > 1) {
          newWidth = 1 - newX;
        }
        if (newY + newHeight > 1) {
          newHeight = 1 - newY;
        }

        // Apply changes
        onSignatureDrag(resizingSignature, newX, newY);
        onSignatureResize(resizingSignature, newWidth, newHeight);
      }
    },
    [
      simpleMode,
      getPdfCoordinates,
      onMouseMove,
      draggedSignature,
      dragOffset,
      onSignatureDrag,
      resizingSignature,
      resizeHandle,
      signatures,
      onSignatureResize,
    ]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (simpleMode) return;

      const coords = getPdfCoordinates(e);
      if (coords) {
        onClick(coords.pdfX, coords.pdfY, coords.pageX, coords.pageY);

        // Add signature on double click (only if signature image is available)
        if (e.detail === 2 && signatureImage) {
          onAddSignature(coords.pageX, coords.pageY, pageTracker.currentPage);
        }
      }
    },
    [
      simpleMode,
      getPdfCoordinates,
      onClick,
      onAddSignature,
      signatureImage,
      tracker,
    ]
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, index: number, handle: "se" | "sw" | "ne" | "nw") => {
      e.stopPropagation();
      setResizingSignature(index);
      setResizeHandle(handle);
    },
    []
  );

  const handleSignatureMouseDown = useCallback(
    (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      setDraggedSignature(index);

      const coords = getPdfCoordinates(e);
      if (coords) {
        const signature = signatures[index];
        setDragOffset({
          x: coords.pageX - signature.x,
          y: coords.pageY - signature.y,
        });
      }
    },
    [getPdfCoordinates, signatures]
  );

  const handleMouseUp = useCallback(() => {
    setDraggedSignature(null);
    setDragOffset({ x: 0, y: 0 });

    setResizingSignature(null);
    setResizeHandle(null);
  }, []);

  const handleSignatureDoubleClick = useCallback(
    (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      onRemoveSignature(index);
    },
    [onRemoveSignature]
  );

  // Filter signatures for current page
  const currentPageSignatures = signatures.filter(
    (sig) => sig.page === tracker.currentPage
  );

  return (
    <div className="ring ring-zinc-700 rounded-lg overflow-hidden">
      {/* Document Header */}
      <div className="bg-zinc-800 px-4 py-3 ring ring-zinc-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-sm font-medium max-w-[200px] truncate text-zinc-100">
              {doc.fileName}
            </h2>
            {isProcessing && (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-zinc-400"></div>
                <span className="text-xs text-zinc-400">Processing...</span>
              </div>
            )}
            {hasError && (
              <span className="text-xs text-red-400 bg-red-100 px-2 py-1 rounded">
                Error: {doc.error}
              </span>
            )}
            {isReady && (
              <span
                className={`text-xs ${doc.status === "pending" ? "text-yellow-400" : "text-green-400"}`}
              >
                {doc.status}
              </span>
            )}
          </div>

          {!simpleMode && tracker && isReady && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <GoToPreviousPage>
                  {(props) => (
                    <button
                      className="px-2 py-1 text-xs bg-zinc-900 ring ring-zinc-400 rounded hover:bg-zinc-700 disabled:opacity-50"
                      onClick={props.onClick}
                      disabled={tracker.currentPage <= 1}
                    >
                      Prev
                    </button>
                  )}
                </GoToPreviousPage>

                <div className="flex items-center space-x-1">
                  <CurrentPageInput />
                  <span className="text-xs text-zinc-100">
                    of {tracker.totalPages}
                  </span>
                </div>

                <GoToNextPage>
                  {(props) => (
                    <button
                      className="px-2 py-1 text-xs bg-zinc-900 ring ring-zinc-400 rounded hover:bg-zinc-700 disabled:opacity-50"
                      onClick={props.onClick}
                      disabled={tracker.currentPage >= tracker.totalPages}
                    >
                      Next
                    </button>
                  )}
                </GoToNextPage>
              </div>

              <div className="flex items-center">
                <ZoomOut>
                  {(props) => (
                    <button
                      className="px-2 py-1 text-xs bg-zinc-800 ring ring-zinc-600 rounded hover:bg-zinc-700"
                      onClick={props.onClick}
                    >
                      -
                    </button>
                  )}
                </ZoomOut>
                <Zoom>
                  {(props) => (
                    <span className="text-xs text-zinc-400 min-w-[3rem] text-center">
                      {Math.round(props.scale * 100)}%
                    </span>
                  )}
                </Zoom>
                <ZoomIn>
                  {(props) => (
                    <button
                      className="px-2 py-1 text-xs bg-zinc-800 ring ring-zinc-600 rounded hover:bg-zinc-700"
                      onClick={props.onClick}
                    >
                      +
                    </button>
                  )}
                </ZoomIn>
              </div>
            </div>
          )}

          {simpleMode && tracker && isReady && (
            <div className="flex items-center space-x-4 relative">
              <p className="text-xs text-zinc-400">
                {tracker.totalPages} page{tracker.totalPages > 1 ? "s" : ""}
              </p>
              {doc.status === "pending" ? (
                <button
                  onClick={() => setOpenModal(true)}
                  className="px-2 py-1 text-xs bg-zinc-800 ring ring-zinc-600 rounded hover:bg-zinc-700"
                >
                  Invite
                </button>
              ) : (
                <button
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = `data:${doc.file.contentType};base64,${doc.base64}`;
                    link.download = doc.fileName || "document.pdf";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="scale-60 hover:scale-75 transition-all cursor-pointer rounded-full"
                >
                  <img src="download.svg" alt="download" />
                </button>
              )}
              {openModal && (
                <Modal onClose={() => setOpenModal(false)} docId={doc._id} />
              )}
            </div>
          )}
        </div>

        {!simpleMode && tracker && isReady && (
          <div className="mt-2 text-xs text-zinc-400">
            Page {tracker.currentPage} | PDF Mouse: (
            {Math.round(tracker.mouseX)}, {Math.round(tracker.mouseY)}) |
            Relative: ({tracker.pageX.toFixed(3)}, {tracker.pageY.toFixed(3)}) |
            Signatures: {currentPageSignatures.length}
            {currentPageSignatures.length > 0 && (
              <div className="mt-1">
                {currentPageSignatures.map((sig, i) => {
                  const bounds = getSignatureBounds(sig);
                  return (
                    <div key={i} className="text-xs">
                      Sig {i + 1}: pos({bounds.x.toFixed(3)},{" "}
                      {bounds.y.toFixed(3)}) size({sig.width.toFixed(3)},{" "}
                      {sig.height.toFixed(3)})
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* PDF Viewer */}
      <div
        className={`${viewerHeight} bg-zinc-600 flex items-center justify-center relative`}
        onMouseUp={handleMouseUp}
      >
        {isProcessing && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-300 mx-auto mb-4"></div>
            <div className="text-zinc-300">Processing document...</div>
          </div>
        )}

        {hasError && (
          <div className="text-center">
            <div className="text-red-400 mb-2">Failed to load document</div>
            <div className="text-xs text-zinc-400">{doc.error}</div>
          </div>
        )}

        {isReady && (
          <div
            ref={pdfContainerRef}
            className="w-full h-full relative"
            onMouseMove={simpleMode ? undefined : handleMouseMove}
            onClick={simpleMode ? undefined : handleClick}
          >
            <Worker
              workerUrl={`https://unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.js`}
            >
              <Viewer
                fileUrl={`data:${doc.file.contentType};base64,${doc.base64}`}
                plugins={
                  simpleMode
                    ? []
                    : [
                        pageNavigationPluginInstance,
                        scrollModePluginInstance,
                        zoomPluginInstance,
                      ]
                }
                defaultScale={SpecialZoomLevel.PageFit}
                scrollMode={ScrollMode.Page}
                onPageChange={simpleMode ? undefined : onPageChange}
                onDocumentLoad={onDocumentLoad}
                initialPage={0}
              />
            </Worker>

            {/* Signature Overlay */}
            {!simpleMode &&
              signatureImage &&
              currentPageSignatures.map((signature, index) => {
                // Calculate actual position ensuring signature stays within bounds
                const actualX = Math.max(
                  0,
                  Math.min(1 - signature.width, signature.x)
                );
                const actualY = Math.max(
                  0,
                  Math.min(1 - signature.height, signature.y)
                );

                return (
                  <div
                    key={`${signature.docId}-${signature.page}-${index}`}
                    className="absolute pointer-events-auto select-none group"
                    style={{
                      left: `${actualX * 100}%`,
                      top: `${actualY * 100}%`,
                      width: `${signature.width * 100}%`,
                      height: `${signature.height * 100}%`,
                      zIndex: 1000,
                    }}
                    title="Double-click to remove. Drag to move. Use corner handles to resize."
                  >
                    {/* Signature Image */}
                    <img
                      src={signatureImage}
                      alt="Signature"
                      className="w-full h-full object-contain cursor-move bg-white/80 rounded shadow-lg border border-gray-300"
                      onMouseDown={(e) =>
                        handleSignatureMouseDown(
                          e,
                          signatures.indexOf(signature)
                        )
                      }
                      onDoubleClick={(e) =>
                        handleSignatureDoubleClick(
                          e,
                          signatures.indexOf(signature)
                        )
                      }
                      draggable={false}
                    />
                    {/* Resize Handles - Positioned relative to signature bounds */}
                    <div
                      className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
                      onMouseDown={(e) =>
                        handleResizeMouseDown(
                          e,
                          signatures.indexOf(signature),
                          "se"
                        )
                      }
                      title="Resize"
                    />
                    <div
                      className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-sw-resize opacity-0 group-hover:opacity-100 transition-opacity"
                      onMouseDown={(e) =>
                        handleResizeMouseDown(
                          e,
                          signatures.indexOf(signature),
                          "sw"
                        )
                      }
                      title="Resize"
                    />
                    <div
                      className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-nw-resize opacity-0 group-hover:opacity-100 transition-opacity"
                      onMouseDown={(e) =>
                        handleResizeMouseDown(
                          e,
                          signatures.indexOf(signature),
                          "nw"
                        )
                      }
                      title="Resize"
                    />
                    <div
                      className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-ne-resize opacity-0 group-hover:opacity-100 transition-opacity"
                      onMouseDown={(e) =>
                        handleResizeMouseDown(
                          e,
                          signatures.indexOf(signature),
                          "ne"
                        )
                      }
                      title="Resize"
                    />
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Instructions */}
      {!simpleMode && isReady && (
        <div className="bg-zinc-800 px-4 py-2 text-xs text-zinc-400">
          💡{" "}
          {signatureImage
            ? "Double-click on PDF to add signature • Drag signatures to move • Hover over signature for resize handles • Double-click signatures to remove"
            : "Upload a signature image in the controls above to start adding signatures"}
        </div>
      )}
    </div>
  );
}
