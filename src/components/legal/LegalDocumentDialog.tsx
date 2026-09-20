import { useEffect, useState } from "react";
import type { CurrentLegalDocuments, LegalDocumentType } from "@/modules/legal";
import LegalMarkdown from "@/components/legal/LegalMarkdown";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPublishedDateEs } from "@/lib/dates";

interface LegalDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab: LegalDocumentType;
  documents: CurrentLegalDocuments | undefined;
  onAccept?: () => void;
}

function documentMeta(document: CurrentLegalDocuments["privacy"] | undefined) {
  if (!document) return "Leé la política de privacidad y los términos antes de crear la cuenta.";
  return `${document.title} · versión ${document.version} · ${formatPublishedDateEs(document.publishedAt)}`;
}

export default function LegalDocumentDialog({
  open,
  onOpenChange,
  initialTab,
  documents,
  onAccept,
}: LegalDocumentDialogProps) {
  const [tab, setTab] = useState<LegalDocumentType>(initialTab);
  const active = tab === "terms" ? documents?.terms : documents?.privacy;

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-h-[min(90vh,44rem)] max-w-2xl gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border px-5 py-4 pr-12">
          <DialogTitle>Documentos legales</DialogTitle>
          <DialogDescription>{documentMeta(active)}</DialogDescription>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as LegalDocumentType)}
          className="min-h-0 gap-0"
        >
          <div className="px-5 pt-3">
            <TabsList className="w-full">
              <TabsTrigger value="privacy" className="flex-1">
                Privacidad
              </TabsTrigger>
              <TabsTrigger value="terms" className="flex-1">
                Términos
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent
            value="privacy"
            className="max-h-[min(55vh,28rem)] overflow-y-auto px-5 py-4"
          >
            {documents ? (
              <LegalMarkdown markdown={documents.privacy.body} />
            ) : null}
          </TabsContent>
          <TabsContent
            value="terms"
            className="max-h-[min(55vh,28rem)] overflow-y-auto px-5 py-4"
          >
            {documents ? <LegalMarkdown markdown={documents.terms.body} /> : null}
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t border-border px-5 py-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {onAccept ? (
            <Button
              type="button"
              onClick={() => {
                onAccept();
                onOpenChange(false);
              }}
            >
              Acepto
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
