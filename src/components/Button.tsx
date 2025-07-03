interface ButtonProps {
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  className?: string;
}

export const Button = ({ children, onClick, type, className }: ButtonProps) => {
  return (
    <button
      type={type || "button"}
      className={`bg-blue-500 w-full cursor-pointer hover:bg-blue-600 text-white py-2 px-4 ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
