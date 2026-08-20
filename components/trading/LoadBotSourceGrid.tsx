"use client";

import { Folder, HardDrive, Sparkles, Workflow, type LucideIcon } from "lucide-react";
import { QUICK_STRATEGY_METAS, type QuickStrategyType } from "@/lib/bot/types";

export type LoadBotSource = "computer" | "drive" | "builder" | "quick";

const QUICK_PICK: QuickStrategyType[] = ["martingale", "dalembert", "oscars_grind"];

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
  sources?: LoadBotSource[];
  onSelect: (source: Exclude<LoadBotSource, "computer">) => void;
}

export function LoadBotSourceGrid({
  computerInputId,
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
            <label key={source.id} htmlFor={computerInputId} className="tc-load-source">
              {inner}
            </label>
          );
        }
        return (
          <button
            key={source.id}
            type="button"
            className="tc-load-source"
            onClick={() => onSelect(source.id)}
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
  open: boolean;
  onClose: () => void;
}

export function DriveFileDialog({ inputId, open, onClose }: DriveFileDialogProps) {
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
          <label htmlFor={inputId} className="tc-btn tc-btn-solid" style={{ cursor: "pointer" }}>
            Choose from Google Drive
          </label>
        </div>
      </div>
    </div>
  );
}

interface QuickStrategyDialogProps {
  open: boolean;
  onClose: () => void;
  onPick: (type: QuickStrategyType) => void;
}

export function QuickStrategyDialog({ open, onClose, onPick }: QuickStrategyDialogProps) {
  if (!open) return null;
  return (
    <div
      className="tc-modal-scrim"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tc-quick-title"
      onClick={onClose}
    >
      <div
        className="tc-modal"
        style={{ width: "min(460px, calc(100vw - 32px))" }}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="tc-modal-title" id="tc-quick-title">
          Quick strategy
        </p>
        <p className="tc-modal-body">
          Pick a ready-made stake progression. Trade parameters open in Bot Builder so you can
          tweak them before you run.
        </p>
        <div className="tc-quick-list">
          {QUICK_PICK.map((type) => {
            const meta = QUICK_STRATEGY_METAS.find((item) => item.type === type);
            return (
              <button
                key={type}
                type="button"
                className="tc-quick-item"
                onClick={() => onPick(type)}
              >
                <strong>{meta?.label ?? type}</strong>
                <span>{meta?.description}</span>
              </button>
            );
          })}
        </div>
        <div className="tc-load-dialog-actions">
          <button type="button" className="tc-btn tc-btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
