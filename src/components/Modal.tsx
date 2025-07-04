import { signLink } from "@/api/sign";
import { AuthContext } from "@/context/AuthProvider";
import { useContext, useRef } from "react";

export default function Modal({
  onClose,
  docId,
}: {
  onClose: () => void;
  docId: string;
}) {
  const emailRef = useRef<HTMLInputElement | null>(null);
  const { user } = useContext(AuthContext);
  const handleSubmit = async () => {
    if (!emailRef.current) return;
    const email = emailRef.current.value.trim();
    user && (await signLink({ email, docId, senderEmail: user.email }));
  };
  return (
    <div className="z-20 top-2 right-0 rounded-xl absolute p-3 space-y-2 bg-zinc-700">
      <div className="flex flex-col space-y-1">
        <label htmlFor="email">
          <p>Email of the signer</p>
        </label>
        <input
          id="email"
          ref={emailRef}
          type="email"
          className="bg-zinc-800 p-2 min-w-56 rounded-md focus:ring-2 ring-sky-600 outline-none"
        />
      </div>
      <div className="flex gap-2">
        <button
          className="bg-zinc-800 hover:bg-zinc-700 rounded-lg flex-1 p-1.5"
          onClick={onClose}
        >
          cancel
        </button>
        <button
          onClick={handleSubmit}
          className="bg-sky-500 hover:bg-sky-600 rounded-lg flex-1 p-1.5"
        >
          send
        </button>
      </div>
    </div>
  );
}
