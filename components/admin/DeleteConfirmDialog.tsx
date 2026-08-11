"use client";

import { Button } from "@/components/ui/button";
import {
  WorkspaceModal,
  WorkspaceModalFrame,
} from "@/components/ui/workspace-modal";

interface DeleteConfirmDialogProps {
  agentName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmDialog({
  agentName,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  return (
    <WorkspaceModal
      open
      onClose={onCancel}
      label="Delete agent"
      labelledBy="delete-dialog-title"
      size="sm"
    >
      <WorkspaceModalFrame
        title="Delete agent"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              className="interactive flex-1"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="interactive flex-1 !bg-negative hover:!bg-negative/90"
              onClick={onConfirm}
            >
              Delete
            </Button>
          </>
        }
      >
        <h2 id="delete-dialog-title" className="text-sm font-semibold">
          Remove this listing?
        </h2>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          <span className="font-medium text-foreground">{agentName}</span> will
          be removed. Use Save changes in the toolbar to persist.
        </p>
      </WorkspaceModalFrame>
    </WorkspaceModal>
  );
}
