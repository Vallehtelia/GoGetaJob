"use client";

import { useEffect, useMemo, useState } from "react";
import { Rnd } from "react-rnd";
import type { CvCanvasBlock, CvCanvasState, CvDocument, UserProfile } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { buildDefaultCanvasState } from "./buildDefaultCanvasState";
import { syncCanvasStateWithCvData } from "./syncCanvasStateWithCvData";

function blockTitle(type: CvCanvasBlock["type"]) {
  switch (type) {
    case "HEADER":
      return "Header";
    case "SUMMARY":
      return "Professional Summary";
    case "WORK":
      return "Work Experience";
    case "PROJECTS":
      return "Projects";
    case "SKILLS":
      return "Skills";
    case "EDUCATION":
      return "Education";
    default:
      return type;
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function CvCanvasEditor({
  cv,
  profile,
  initialCanvasState,
  onSave,
}: {
  cv: CvDocument;
  profile: UserProfile;
  initialCanvasState?: CvCanvasState | null;
  onSave: (state: CvCanvasState) => Promise<void> | void;
}) {
  const defaultState = useMemo(() => buildDefaultCanvasState(cv, profile), [cv, profile]);

  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [state, setState] = useState<CvCanvasState>(initialCanvasState ?? defaultState);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // If CV has no saved canvasState, initialize from defaults once
  useEffect(() => {
    if (!initialCanvasState) {
      setState(defaultState);
      setDirty(true); // allow user to save initial layout if they edit
    } else {
      setState(initialCanvasState);
      setDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cv.id]);

  // Accept external updates (e.g. AI summary sync) when not actively editing unsaved changes.
  useEffect(() => {
    if (!initialCanvasState) return;
    if (dirty) return;
    if (editMode) return;
    setState(initialCanvasState);
  }, [initialCanvasState, dirty, editMode]);

  // Keep preview text in sync with CV inclusions/summary changes,
  // without overwriting the user's unsaved layout edits.
  useEffect(() => {
    if (editMode) return; // avoid clobbering manual textarea edits
    setState((prev) => {
      const next = syncCanvasStateWithCvData(prev, cv, profile);
      if (canvasTextEqual(prev, next)) return prev;
      return next;
    });
    // NOTE: intentionally does not flip `dirty` — this is content syncing, not layout editing.
  }, [cv, profile, editMode]);

  const selectedBlock = state.blocks.find((b) => b.id === selectedId) || null;

  const updateBlock = (id: string, patch: Partial<CvCanvasBlock>) => {
    setState((prev) => {
      const blocks = prev.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b));
      return { ...prev, blocks };
    });
    setDirty(true);
  };

  // Update x/y during drag WITHOUT marking dirty (keeps controlled dragging smooth)
  const updateBlockPositionPreview = (id: string, x: number, y: number) => {
    setState((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? { ...b, x, y } : b)),
    }));
  };

  const updateBlockText = (id: string, text: string) => {
    setState((prev) => {
      const blocks = prev.blocks.map((b) =>
        b.id === id ? { ...b, content: { ...b.content, text } } : b
      );
      return { ...prev, blocks };
    });
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(state);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant={editMode ? "secondary" : "ghost"} onClick={() => setEditMode((v) => !v)}>
            {editMode ? "Editing layout" : "Edit layout"}
          </Button>
          {editMode && selectedBlock && (
            <div className="text-sm text-gray-600">
              Selected: <span className="font-semibold">{blockTitle(selectedBlock.type)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => { setState(defaultState); setDirty(true); }}>
            Reset to template
          </Button>
          <Button onClick={handleSave} disabled={!dirty || saving}>
            {saving ? "Saving..." : "Save layout"}
          </Button>
        </div>
      </div>

      {editMode && selectedBlock && (
        <Card className="p-3">
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium">Scale</div>
            <input
              type="range"
              min={50}
              max={200}
              value={Math.round((selectedBlock.fontScale || 1) * 100)}
              onChange={(e) =>
                updateBlock(selectedBlock.id, { fontScale: clamp(Number(e.target.value) / 100, 0.5, 2) })
              }
            />
            <div className="text-sm text-gray-700 w-12">
              {Math.round((selectedBlock.fontScale || 1) * 100)}%
            </div>
          </div>
        </Card>
      )}

      <div
        className="overflow-y-auto overflow-x-hidden rounded-xl bg-white flex justify-center"
        style={{ maxHeight: "calc(100vh - 180px)" }}
        onMouseDown={(e) => {
          if (!editMode) return;
          // Only deselect when clicking blank background (not inside any child/block)
          if (e.target !== e.currentTarget) return;
          setSelectedId(null);
        }}
      >
        <div
          className="relative bg-white shadow-lg border border-gray-200"
          style={{ width: state.page.width, height: state.page.height }}
        >
          {state.blocks.map((b) => {
            const isSelected = selectedId === b.id;
            const fontSize = 14 * (b.fontScale || 1);

            if (!editMode) {
              return (
                <div
                  key={b.id}
                  className="absolute p-3 overflow-hidden"
                  style={{ left: b.x, top: b.y, width: b.w, height: b.h, fontSize, lineHeight: 1.35 }}
                >
                  {b.type !== "HEADER" && (
                    <div className="text-xs font-semibold text-navy-700 mb-2">{blockTitle(b.type)}</div>
                  )}
                  <pre className="whitespace-pre-wrap text-gray-900 text-sm m-0">{b.content.text}</pre>
                </div>
              );
            }

            return (
              <Rnd
                key={b.id}
                bounds="parent"
                size={{ width: b.w, height: b.h }}
                position={{ x: b.x, y: b.y }}
                // Drag should start ONLY from the dedicated handle row.
                dragHandleClassName="cv-drag-handle"
                cancel=".cv-block-textarea"
                enableUserSelectHack={true}
                onDragStart={() => setSelectedId(b.id)}
                onDrag={(_e, d) => {
                  // Smooth controlled dragging: update x/y continuously without dirty flip
                  updateBlockPositionPreview(b.id, d.x, d.y);
                }}
                onResizeStart={() => setSelectedId(b.id)}
                onDragStop={(_e, d) => updateBlock(b.id, { x: d.x, y: d.y })}
                onResizeStop={(_e, _dir, ref, _delta, position) => {
                  updateBlock(b.id, {
                    w: ref.offsetWidth,
                    h: ref.offsetHeight,
                    x: position.x,
                    y: position.y,
                  });
                }}
                enableResizing={{
                  top: true,
                  right: true,
                  bottom: true,
                  left: true,
                  topRight: true,
                  bottomRight: true,
                  bottomLeft: true,
                  topLeft: true,
                }}
                className={cn(isSelected ? "z-20" : "z-10")}
              >
                <div
                  className={cn(
                    "h-full w-full p-3 bg-white select-none",
                    isSelected ? "ring-2 ring-pink-500" : "ring-1 ring-gray-200"
                  )}
                  style={{ fontSize, lineHeight: 1.35 }}
                >
                  {/* IMPORTANT: do NOT put onMouseDown on the direct child of <Rnd>.
                      Wrap content and attach selection handlers to an inner element instead. */}
                  <div
                    className="h-full w-full"
                    onClickCapture={(e) => {
                      e.stopPropagation();
                      setSelectedId(b.id);
                    }}
                  >
                    {/* Drag affordance row (drag works from anywhere except textarea) */}
                    <div className="mb-2 flex items-center justify-between cursor-move select-none cv-drag-handle">
                      {/* Keep header title hidden, but still show handle */}
                      <div className="text-xs font-semibold text-navy-700">
                        {b.type !== "HEADER" ? blockTitle(b.type) : ""}
                      </div>
                      <div className="text-gray-400 text-xs">⋮⋮</div>
                    </div>

                    {isSelected ? (
                      <textarea
                        className="cv-block-textarea w-full h-[calc(100%-48px)] resize-none border border-gray-200 rounded p-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        value={b.content.text}
                        onChange={(e) => updateBlockText(b.id, e.target.value)}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                        }}
                        style={{ userSelect: "text" }}
                      />
                    ) : (
                      <pre
                        className="whitespace-pre-wrap text-gray-900 text-sm m-0"
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{ userSelect: "none" }}
                      >
                        {b.content.text}
                      </pre>
                    )}
                  </div>
                </div>
              </Rnd>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function canvasTextEqual(a: CvCanvasState, b: CvCanvasState) {
  const types = ["HEADER", "SUMMARY", "WORK", "PROJECTS", "SKILLS", "EDUCATION"] as const;
  const get = (s: CvCanvasState, type: (typeof types)[number]) =>
    (s.blocks.find((blk) => blk.type === type)?.content.text ?? "").replace(/\r\n/g, "\n").trimEnd();
  return types.every((t) => get(a, t) === get(b, t));
}
