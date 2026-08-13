interface SnackbarProps {
  message: string;
}

export default function Snackbar({ message }: SnackbarProps) {
  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full bg-primary-900/90 text-white font-point text-sm shadow-drop backdrop-blur-sm animate-[snackbar-in_0.2s_ease-out]">
      {message}
    </div>
  );
}
