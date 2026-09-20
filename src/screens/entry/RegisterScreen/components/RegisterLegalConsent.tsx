import { useEffect, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { CurrentLegalDocuments, LegalDocumentType } from "@/modules/legal";
import LegalDocumentDialog from "@/components/legal/LegalDocumentDialog";
import { Label } from "@/components/ui/label";

interface RegisterLegalConsentProps {
  documents: CurrentLegalDocuments | undefined;
  isLoading: boolean;
  isError: boolean;
}

export default function RegisterLegalConsent({
  documents,
  isLoading,
  isError,
}: RegisterLegalConsentProps) {
  const { control, setValue } = useFormContext<{ acceptedLegal: boolean }>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState<LegalDocumentType>("privacy");

  useEffect(() => {
    setValue("acceptedLegal", false, { shouldValidate: false, shouldDirty: false });
  }, [documents?.privacy.id, documents?.terms.id, setValue]);

  const openDocument = (type: LegalDocumentType) => {
    setDialogTab(type);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/40 px-3 py-3">
      <Controller
        name="acceptedLegal"
        control={control}
        render={({ field, fieldState }) => (
          <div className="flex items-start gap-3">
            <input
              id="reg-acceptedLegal"
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 rounded border border-input accent-primary"
              checked={field.value}
              disabled={isLoading || isError || !documents}
              onChange={(event) => field.onChange(event.target.checked)}
            />
            <div className="min-w-0 space-y-1">
              <p className="text-sm leading-5 text-muted-foreground">
                <Label
                  htmlFor="reg-acceptedLegal"
                  className="inline font-normal leading-5 text-muted-foreground"
                >
                  He leído y acepto la{" "}
                </Label>
                <button
                  type="button"
                  className="font-medium text-foreground underline underline-offset-4"
                  onClick={() => openDocument("privacy")}
                >
                  política de privacidad
                </button>{" "}
                y los{" "}
                <button
                  type="button"
                  className="font-medium text-foreground underline underline-offset-4"
                  onClick={() => openDocument("terms")}
                >
                  términos y condiciones
                </button>
                .
              </p>
              {documents ? (
                <p className="text-xs text-muted-foreground">
                  Versión {documents.privacy.version} · vigente al crear la
                  cuenta
                </p>
              ) : null}
              {isLoading ? (
                <p className="text-xs text-muted-foreground">
                  Cargando documentos legales…
                </p>
              ) : null}
              {isError ? (
                <p className="text-sm text-destructive">
                  No pudimos cargar las políticas. Recargá la página e intentá
                  de nuevo.
                </p>
              ) : null}
              {fieldState.error?.message ? (
                <p className="text-sm text-destructive">
                  {fieldState.error.message}
                </p>
              ) : null}
            </div>
          </div>
        )}
      />

      <LegalDocumentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialTab={dialogTab}
        documents={documents}
        onAccept={() =>
          setValue("acceptedLegal", true, {
            shouldValidate: true,
            shouldDirty: true,
          })
        }
      />
    </div>
  );
}
