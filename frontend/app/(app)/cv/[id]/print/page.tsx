"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { CvCanvasState, CvDocument, UserProfile } from "@/lib/types";
import { syncCanvasStateWithCvData } from "@/components/cv/syncCanvasStateWithCvData";
import { CvCanvas } from "@/components/cv/CvCanvas";
import { Button } from "@/components/ui/Button";

export default function CvPrintPage() {
  const params = useParams();
  const cvId = params.id as string;

  const [cv, setCv] = useState<CvDocument | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const [cvData, profileData] = await Promise.all([api.getCv(cvId), api.getProfile()]);
        setCv(cvData);
        setProfile(profileData);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [cvId]);

  const canvasState: CvCanvasState | null = useMemo(() => {
    if (!cv || !profile) return null;
    // Ensure print view reflects current included items + summary.
    return syncCanvasStateWithCvData((cv.canvasState as CvCanvasState | null) ?? null, cv, profile);
  }, [cv, profile]);

  useEffect(() => {
    if (!canvasState) return;
    // Optional: auto-open print dialog after render
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [canvasState]);

  if (loading || !cv || !profile || !canvasState) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-700">Preparing print view…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="p-4 print:hidden flex justify-center gap-3">
        <Button onClick={() => window.print()}>Print / Save as PDF</Button>
        <Button variant="secondary" onClick={() => window.close()}>
          Close
        </Button>
      </div>

      <div className="flex justify-center py-6 print:p-0 print:m-0">
        <div className="print:shadow-none print:border-none">
          <CvCanvas state={canvasState} />
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            margin: 0;
            size: A4;
          }
          html,
          body {
            background: #fff !important;
          }
        }
      `}</style>
    </div>
  );
}

