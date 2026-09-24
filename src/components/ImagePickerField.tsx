import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import ImageEditOverlay from "@/components/ImageEditOverlay";
import { toastError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { IMAGE_FILE_ACCEPT, imageFileError } from "@/utils";

interface ImagePickerFieldProps {
  id?: string;
  imageUrl?: string | null;
  file?: File | null;
  alt?: string;
  emptyLabel?: string;
  canEdit?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  frameClassName?: string;
  className?: string;
  testId?: string;
  children?: ReactNode;
  onFileSelect: (file: File) => void;
}

export default function ImagePickerField({
  id,
  imageUrl,
  file = null,
  alt = "",
  emptyLabel = "Sin imagen",
  canEdit = false,
  disabled = false,
  ariaLabel = "Editar imagen",
  frameClassName,
  className,
  testId,
  children,
  onFileSelect,
}: ImagePickerFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const shownUrl = previewUrl ?? imageUrl ?? null;
  const editable = canEdit && !disabled;

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const openPicker = () => {
    if (!editable) return;
    inputRef.current?.click();
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0];
    event.target.value = "";
    if (!next) return;
    const error = imageFileError(next);
    if (error) {
      toastError("No se pudo usar la imagen", error);
      return;
    }
    onFileSelect(next);
  };

  const frameClass = cn(
    "group relative",
    children
      ? null
      : "block w-full overflow-hidden rounded-lg border border-border bg-muted",
    frameClassName,
  );

  const frame = (
    <>
      {children ??
        (shownUrl ? (
          <img src={shownUrl} alt={alt} className="aspect-[16/9] w-full object-cover" />
        ) : (
          <span className="flex aspect-[16/9] w-full items-center justify-center px-3 text-sm text-muted-foreground">
            {emptyLabel}
          </span>
        ))}
      {editable ? <ImageEditOverlay /> : null}
    </>
  );

  return (
    <div className={className}>
      {editable ? (
        <button
          id={id}
          type="button"
          className={frameClass}
          aria-label={ariaLabel}
          data-testid={testId}
          onClick={openPicker}
        >
          {frame}
        </button>
      ) : (
        <div
          className={frameClass}
        >
          {frame}
        </div>
      )}
      {canEdit ? (
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_FILE_ACCEPT}
          className="hidden"
          tabIndex={-1}
          aria-hidden
          disabled={disabled}
          onChange={handleChange}
        />
      ) : null}
    </div>
  );
}
