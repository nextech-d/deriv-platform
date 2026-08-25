/**
 * Inspect the contents of the trash.
 * @deriv/bot: Noop for us, restore original functionality when trashcan can be inspected.
 */
window.Blockly.Trashcan.prototype.click = function () {};

window.Blockly.Trashcan.prototype.setTrashcanPosition = (position_right, position_top) => {
    const trashcan_instance = window.Blockly.derivWorkspace?.trashcan?.svgGroup;
    trashcan_instance?.setAttribute('transform', `translate(${position_right}, ${position_top})`);
};

const placeTrashInVisibleHole = () => {
    const workspace = window.Blockly?.derivWorkspace;
    const trashcan = workspace?.trashcan;
    if (!trashcan?.svgGroup || !trashcan.setTrashcanPosition) return;

    const injection =
        document.getElementById('scratch_div') || document.querySelector('.bot-builder .injectionDiv');
    if (!injection) return;

    const inj = injection.getBoundingClientRect();
    const panel = document.querySelector('.run-panel__container.dc-drawer--open')?.getBoundingClientRect();
    const footer = document.querySelector('.app-footer')?.getBoundingClientRect();
    const fab = document.querySelector('.entry-scanner-fab')?.getBoundingClientRect();
    const trash_box = injection.querySelector('.blocklyTrash')?.getBoundingClientRect();
    const trash_w = Math.max(96, trash_box?.width || 0);
    const trash_h = Math.max(96, trash_box?.height || 0);

    const right_limit = Math.min(inj.right, panel?.left ?? inj.right, fab?.left ?? inj.right);
    const bottom_limit = Math.min(inj.bottom, footer?.top ?? inj.bottom);
    const x = Math.max(24, right_limit - inj.left - trash_w - 20);
    const y = Math.max(24, bottom_limit - inj.top - trash_h - 20);
    trashcan.setTrashcanPosition(x, y);

    const placed = injection.querySelector('.blocklyTrash')?.getBoundingClientRect();
    if (!placed || !fab) return;
    const overlaps =
        placed.left < fab.right && placed.right > fab.left && placed.top < fab.bottom && placed.bottom > fab.top;
    if (!overlaps) return;
    trashcan.setTrashcanPosition(Math.max(24, fab.left - inj.left - placed.width - 20), y);
};

window.Blockly.Trashcan.placeInVisibleHole = placeTrashInVisibleHole;
window.Blockly.Trashcan.prototype.position = function () {
    // During inject, derivWorkspace is not assigned yet. Calling Blockly's default
    // position here crashes (toolboxMetrics on an unfinished workspace). Preview
    // workspaces inject with trashcan: false, so a no-op is correct for them.
    if (this.workspace && this.workspace === window.Blockly.derivWorkspace) {
        placeTrashInVisibleHole();
    }
};
