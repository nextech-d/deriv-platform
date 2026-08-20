"use client";

import { type RefObject } from "react";
import { Folder, HardDrive, Sparkles, Workflow, type LucideIcon } from "lucide-react";

export type LoadBotSource = "computer" | "drive" | "builder" | "quick";

const SOURCES: {
  id: LoadBotSource;
  title: string;
  icon: LucideIcon;
}[] = [
  { id: "computer", title: "My computer", icon: HardDrive },
  { id: "drive", title: "Google Drive", icon: Folder },
  { id: "builder", title: "Bot builder", icon: Workflow },
  { id: "quick", title: "Quick strategy", icon: Sparkles },
];

interface LoadBotSourceGridProps {
  computerInputId: string;
  computerInputRef?: RefObject<HTMLInputElement | null>;
  sources?: LoadBotSource[];
  onSelect: (source: Exclude<LoadBotSource, "computer">) => void;
}

function openComputerPicker(
  computerInputId: string,
  computerInputRef?: RefObject<HTMLInputElement | null>,
) {
  const input = computerInputRef?.current ?? document.getElementById(computerInputId);
  if (input instanceof HTMLInputElement) {
    input.value = "";
    input.click();
  }
}

export function LoadBotSourceGrid({
  computerInputId,
  computerInputRef,
  sources = ["computer", "drive", "builder", "quick"],
  onSelect,
}: LoadBotSourceGridProps) {
  return (
    <div className="tc-load-grid">
      {SOURCES.filter((source) => sources.includes(source.id)).map((source) => {
        const Icon = source.icon;
        const inner = (
          <>
            <Icon style={{ width: 20, height: 20, color: "#0f766e" }} strokeWidth={1.75} />
            {source.title}
          </>
        );
        if (source.id === "computer") {
          return (
            <button
              key={source.id}
              type="button"
              className="tc-load-source"
              onClick={() => openComputerPicker(computerInputId, computerInputRef)}
            >
              {inner}
            </button>
          );
        }
        return (
          <button
            key={source.id}
            type="button"
            className="tc-load-source"
            onClick={() => {
              if (source.id === "computer") return;
              onSelect(source.id);
            }}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}

interface DriveFileDialogProps {
  inputId: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  open: boolean;
  onClose: () => void;
}

export function DriveFileDialog({ inputId, inputRef, open, onClose }: DriveFileDialogProps) {
  if (!open) return null;
  return (
    <div
      className="tc-modal-scrim"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tc-drive-title"
      onClick={onClose}
    >
      <div className="tc-modal" onClick={(event) => event.stopPropagation()}>
        <p className="tc-modal-title" id="tc-drive-title">
          Google Drive
        </p>
        <p className="tc-modal-body">
          Choose a bot XML saved from Google Drive. This desk opens a local file picker — pick
          the file you downloaded from Drive.
        </p>
        <div className="tc-load-dialog-actions">
          <button type="button" className="tc-btn tc-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="tc-btn tc-btn-solid"
            onClick={() => openComputerPicker(inputId, inputRef)}
          >
            Choose from Google Drive
          </button>
        </div>
      </div>
    </div>
  );
}
