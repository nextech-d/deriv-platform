/**
 * @jest-environment jsdom
 */
import { getVisibleBuilderHole, getWorkspaceOriginPad } from '../builder-chrome';

describe('getVisibleBuilderHole', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div class="bot-builder" style="position:relative">
                <div class="db-toolbox" style="position:absolute;left:0;top:0;width:236px;height:600px"></div>
                <div class="toolbar" style="position:absolute;left:236px;top:0;width:400px;height:56px"></div>
                <div id="scratch_div" style="position:absolute;left:0;top:0;width:900px;height:600px"></div>
            </div>
        `;
        const scratch = document.getElementById('scratch_div')!;
        const toolbox = document.querySelector('.db-toolbox') as HTMLElement;
        const toolbar = document.querySelector('.toolbar') as HTMLElement;
        jest.spyOn(scratch, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 900, 600));
        jest.spyOn(toolbox, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 236, 600));
        jest.spyOn(toolbar, 'getBoundingClientRect').mockReturnValue(new DOMRect(236, 0, 400, 56));
    });

    it('starts the hole to the right of the Blocks menu', () => {
        const hole = getVisibleBuilderHole();
        expect(hole).not.toBeNull();
        expect(hole!.left).toBeGreaterThanOrEqual(236);
        expect(hole!.top).toBeGreaterThanOrEqual(56);
        expect(hole!.width).toBeGreaterThan(500);
    });

    it('pads Blockly origin so the first column is not under the menu', () => {
        const pad = getWorkspaceOriginPad(1);
        expect(pad.x).toBeGreaterThanOrEqual(236);
        expect(pad.y).toBeGreaterThanOrEqual(56);
    });
});
