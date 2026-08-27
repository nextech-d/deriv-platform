/** Screen rect of the Blockly canvas that is not covered by Bot Builder chrome. */
export function getVisibleBuilderHole(): DOMRect | null {
    const injection =
        (document.getElementById('scratch_div') as HTMLElement | null) ||
        (document.querySelector('.bot-builder .injectionDiv') as HTMLElement | null);
    if (!injection) return null;

    const inj = injection.getBoundingClientRect();
    const toolbox =
        document.querySelector('.bot-builder .db-toolbox')?.getBoundingClientRect() ??
        document.getElementById('gtm-toolbox')?.getBoundingClientRect();
    const toolbar = document.querySelector('.bot-builder .toolbar')?.getBoundingClientRect();
    const rail = document.querySelector('.bot-builder .toolbar__wrapper')?.getBoundingClientRect();
    const panel = document.querySelector('.run-panel__container.dc-drawer--open')?.getBoundingClientRect();
    const footer = document.querySelector('.app-footer')?.getBoundingClientRect();
    const rail_is_vertical = Boolean(rail && rail.height > rail.width * 2);
    const panel_is_right_drawer = Boolean(panel && panel.left > inj.left + 80 && panel.height > 120);

    const left = Math.max(inj.left, toolbox?.right ?? inj.left, rail_is_vertical && rail ? rail.right : inj.left) + 12;
    const top = Math.max(inj.top, toolbar?.bottom ?? inj.top) + 8;
    const right = Math.min(inj.right, panel_is_right_drawer && panel ? panel.left : inj.right) - 12;
    const bottom = Math.min(inj.bottom, footer?.top ?? inj.bottom) - 8;
    const width = right - left;
    const height = bottom - top;
    if (width < 60 || height < 60) return null;
    return new DOMRect(left, top, width, height);
}

/** Blockly-space offset so the first column starts past the Blocks menu / mobile rail. */
export function getWorkspaceOriginPad(scale = 1): { x: number; y: number } {
    const hole = getVisibleBuilderHole();
    const inj = document.getElementById('scratch_div')?.getBoundingClientRect();
    if (!hole || !inj) return { x: 0, y: 0 };
    const safe_scale = scale > 0 ? scale : 1;
    return {
        x: Math.max(0, (hole.left - inj.left) / safe_scale),
        y: Math.max(0, (hole.top - inj.top) / safe_scale),
    };
}
