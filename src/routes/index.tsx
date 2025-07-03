// import { docsUpload } from "@/api/docs";
import { Button } from "@/components/Button";
import Sign from "@/components/Sign";
import { AuthContext } from "@/context/AuthProvider";
import { createFileRoute } from "@tanstack/react-router";
import { useContext, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { user } = useContext(AuthContext);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  console.log(file);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(e.type === "dragenter" || e.type === "dragover");
    if (e.type === "drop") {
      if (!e.dataTransfer) return;
      setFile(e.dataTransfer.files[0]);
      if (inputRef.current) {
        const data = new DataTransfer();
        data.items.add(e.dataTransfer.files[0]);
        inputRef.current.files = data.files;
      }
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setFile(e.target.files[0]);
  };

  // const handleClick = async () => {
  //   const formData = new FormData();
  //   if (!file || !user) return;
  //   formData.append("pdf", file);
  //   console.log(typeof user.userId);
  //   formData.append("userId", user.userId);
  //   await docsUpload({ formData });
  // };

  return (
    <section className="p-4 max-w-6xl mx-auto space-y-4">
      <div className="w-full space-y-1 md:w-fit mx-auto">
        <h1 className="text-2xl font-semibold">
          Welcome to <span className="text-sky-300 font-bold">Signer</span>
        </h1>
        <p className="text-zinc-400 font-light">
          Signer allows you to embed your signature to your pdf document
        </p>
      </div>
      {!file ? (
        <div className="space-y-4 max-w-3xl mx-auto">
          <div className="flex flex-col w-full max-w-3xl mx-auto items-center space-y-2">
            <label htmlFor="file">Drop your pdf or select a file</label>
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrag}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed border-zinc-400 h-64 w-full rounded-lg flex items-center justify-center cursor-pointer ${
                isDragging ? "bg-zinc-800" : ""
              }`}
            >
              <p className="text-zinc-400">Drag and drop or click to upload</p>
            </div>
            <input
              type="file"
              name="file"
              id="file"
              accept=".pdf"
              ref={inputRef}
              onChange={handleInput}
              className="ring-2 w-full cursor-pointer transition-all file:cursor-pointer ring-zinc-600 hover:ring-sky-300 file:py-2 file:px-6 file:bg-zinc-200 file:text-zinc-950 rounded-full"
            />
          </div>
          <Button className="rounded-full">proceed for signature</Button>
        </div>
      ) : (
        <Sign file={file} userId={user?.userId} />
      )}
    </section>
  );
}
