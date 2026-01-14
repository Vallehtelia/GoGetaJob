"use client";

import type { CvCanvasBlock, CvCanvasState } from "@/lib/types";
import { cn } from "@/lib/utils";

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

export function CvCanvas({
  state,
  selectedBlockId,
  editMode,
  onSelectBlock,
  onChangeBlockText,
}: {
  state: CvCanvasState;
  selectedBlockId?: string | null;
  editMode?: boolean;
  onSelectBlock?: (id: string) => void;
  onChangeBlockText?: (id: string, text: string) => void;
}) {
  return (
    <div
      className="relative bg-white shadow-lg border border-gray-200"
      style={{ width: state.page.width, height: state.page.height }}
      onMouseDown={() => {
        if (!editMode) return;
        onSelectBlock?.("");
      }}
    >
      {state.blocks.map((b) => {
        const isSelected = !!selectedBlockId && selectedBlockId === b.id;
        return (
          <div
            key={b.id}
            className={cn(
              "absolute p-3 overflow-hidden",
              editMode ? "cursor-move" : "",
              isSelected ? "ring-2 ring-pink-500" : "ring-1 ring-transparent"
            )}
            style={{
              left: b.x,
              top: b.y,
              width: b.w,
              height: b.h,
              fontSize: `${14 * (b.fontScale || 1)}px`,
              lineHeight: 1.35,
            }}
            onMouseDown={(e) => {
              if (!editMode) return;
              e.stopPropagation();
              onSelectBlock?.(b.id);
            }}
          >
            {b.type !== "HEADER" && (
              <div className="text-xs font-semibold text-navy-700 mb-2">{blockTitle(b.type)}</div>
            )}
            {editMode && isSelected ? (
              <textarea
                className="w-full h-[calc(100%-24px)] resize-none border border-gray-200 rounded p-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500"
                value={b.content.text}
                onChange={(e) => onChangeBlockText?.(b.id, e.target.value)}
              />
            ) : (
              <pre className="whitespace-pre-wrap text-gray-900 text-sm m-0">
                {b.content.text}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
}

