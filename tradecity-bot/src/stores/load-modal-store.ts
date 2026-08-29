import React from 'react';
import { action, computed, makeObservable, observable, reaction } from 'mobx';
import { v4 as uuidv4 } from 'uuid';
import {
    api_base,
    getSavedWorkspaces,
    load,
    removeExistingWorkspace,
    save_types,
    saveWorkspaceToRecent,
} from '@/external/bot-skeleton';
import { inject_workspace_options, loadWorkspace, revealLoadedWorkspace, updateXmlValues } from '@/external/bot-skeleton/scratch/utils';
import { isDbotRTL } from '@/external/bot-skeleton/utils/workspace';
import { TStores } from '@deriv/stores/types';
import { localize } from '@deriv-com/translations';
import { TStrategy } from 'Types';
/* [AI] - Analytics event tracking removed - see migrate-docs/MONITORING_PACKAGES.md for re-implementation guide */
/* [/AI] */
import { tabs_title } from '../constants/load-modal';
import { waitForDomElement } from '../utils/dom-observer';
import RootStore from './root-store';

const waitForBuilderCanvas = async (max_ms = 4000): Promise<boolean> => {
    const deadline = Date.now() + max_ms;
    while (Date.now() < deadline) {
        const rect = document.getElementById('scratch_div')?.getBoundingClientRect();
        if (rect && rect.width >= 80 && rect.height >= 80) return true;
        await new Promise<void>(resolve => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
    }
    return false;
};

export default class LoadModalStore {
    root_store: RootStore;
    core: TStores;
    imported_strategy_type = 'pending';

    constructor(root_store: RootStore, core: any) {
        makeObservable(this, {
            active_index: observable,
            is_load_modal_open: observable,
            is_explanation_expand: observable,
            is_strategy_loaded: observable,
            is_delete_modal_open: observable,
            is_strategy_removed: observable,
            loaded_local_file: observable,
            recent_strategies: observable,
            dashboard_strategies: observable,
            selected_strategy_id: observable,
            current_workspace_id: observable,
            upload_id: observable,
            preview_workspace: computed,
            selected_strategy: computed,
            tab_name: computed,
            is_open_button_disabled: observable,
            setOpenButtonDisabled: action.bound,
            getSelectedStrategyID: action.bound,
            refreshStrategies: action.bound,
            loadStrategyToBuilder: action.bound,
            refreshStrategiesTheme: action.bound,
            handleFileChange: action.bound,
            loadFileFromRecent: action.bound,
            loadFileFromLocal: action.bound,
            imported_strategy_type: observable,
            onActiveIndexChange: action.bound,
            onDriveOpen: action.bound,
            onEntered: action.bound,
            onLoadModalClose: action.bound,
            onZoomInOutClick: action.bound,
            setActiveTabIndex: action.bound,
            setLoadedLocalFile: action.bound,
            setRecentStrategies: action.bound,
            setSelectedStrategyId: action.bound,
            toggleExplanationExpand: action.bound,
            toggleLoadModal: action.bound,
            toggleTourLoadModal: action.bound,
            readFile: action.bound,
            resetBotBuilderStrategy: action.bound,
            setDashboardStrategies: action.bound,
            updateListStrategies: action.bound,
            onToggleDeleteDialog: action,
            loadStrategyOnModalRecentPreview: action,
            loadStrategyOnBotBuilder: action,
            saveStrategyToLocalStorage: action,
            updateXmlValuesOnStrategySelection: action,
        });

        this.root_store = root_store;
        this.core = core;

        reaction(
            () => this.active_index,
            () => this.onActiveIndexChange()
        );
        reaction(
            () => this.is_load_modal_open,
            async is_load_modal_open => {
                if (is_load_modal_open) {
                    const saved_workspaces = await getSavedWorkspaces();
                    if (!saved_workspaces) return;
                    this.setRecentStrategies(saved_workspaces);
                    this.setDashboardStrategies(saved_workspaces);
                    if (saved_workspaces.length > 0) {
                        const id = this.selected_strategy_id || saved_workspaces[0].id;
                        this.setSelectedStrategyId(id);
                        if (this.tab_name === tabs_title.TAB_RECENT) {
                            this.loadStrategyOnModalRecentPreview(id);
                            this.updateXmlValuesOnStrategySelection();
                        }
                    }
                } else {
                    this.onLoadModalClose();
                }
            }
        );
    }

    recent_workspace: window.Blockly.WorkspaceSvg | null = null;
    local_workspace: window.Blockly.WorkspaceSvg | null = null;
    drop_zone: unknown;

    active_index = 0;
    is_load_modal_open = false;
    is_explanation_expand = false;
    is_open_button_loading = false;
    is_open_button_disabled = false;
    loaded_local_file: File | null = null;
    recent_strategies: Array<TStrategy> = [];
    dashboard_strategies: Array<TStrategy> | [] = [];
    selected_strategy_id = '';
    is_strategy_loaded = false;
    is_delete_modal_open = false;
    is_strategy_removed = false;
    current_workspace_id = '';
    upload_id = '';

    get preview_workspace(): window.Blockly.WorkspaceSvg | null {
        if (this.tab_name === tabs_title.TAB_LOCAL) return this.local_workspace;
        if (this.tab_name === tabs_title.TAB_RECENT) return this.recent_workspace;
        return null;
    }

    get selected_strategy(): TStrategy {
        const pool =
            this.recent_strategies.length > 0 ? this.recent_strategies : this.dashboard_strategies;
        return (
            pool.find((ws: { id: string }) => ws.id === this.selected_strategy_id) ??
            pool[0]
        );
    }

    get tab_name(): string {
        if (this.core.ui.is_mobile) {
            if (this.active_index === 0) return tabs_title.TAB_LOCAL;
            if (this.active_index === 1) return tabs_title.TAB_GOOGLE;
        }
        if (this.active_index === 0) return tabs_title.TAB_RECENT;
        if (this.active_index === 1) return tabs_title.TAB_LOCAL;
        if (this.active_index === 2) return tabs_title.TAB_GOOGLE;
        return '';
    }

    setOpenButtonDisabled = (is_open_button_disabled: boolean) => {
        this.is_open_button_disabled = is_open_button_disabled;
    };

    getSelectedStrategyID = (current_workspace_id: string) => {
        this.current_workspace_id = current_workspace_id;
    };

    setDashboardStrategies = (strategies: Array<TStrategy>) => {
        this.dashboard_strategies = strategies;
        if (!strategies.length) {
            this.selected_strategy_id = '';
        }
    };

    getDashboardStrategies = async () => {
        const recent_strategies = await getSavedWorkspaces();
        this.dashboard_strategies = recent_strategies;
    };

    onDriveOpen = async () => {
        const { google_drive } = this.root_store;
        const { verifyGoogleDriveAccessToken } = google_drive;
        const result = await verifyGoogleDriveAccessToken();
        if (result === 'not_verified') return;

        if (google_drive) {
            google_drive.upload_id = uuidv4();
        }

        /* [AI] - Analytics event tracking removed - see migrate-docs/MONITORING_PACKAGES.md for re-implementation guide */
        /* [/AI] */

        const { loadFile } = this.root_store.google_drive;
        const load_file = await loadFile();
        if (!load_file) return;
        const xml_doc = load_file?.xml_doc;
        const file_name = load_file?.file_name;
        await load({
            block_string: xml_doc,
            file_name,
            workspace: window.Blockly.derivWorkspace,
            from: save_types.GOOGLE_DRIVE,
            drop_event: null,
            strategy_id: null,
            showIncompatibleStrategyDialog: null,
        });

        const { active_tab } = this.root_store.dashboard;
        if (active_tab === 1) this.toggleLoadModal();

        this.root_store.dashboard.is_dialog_open = false;
    };

    onEntered = (): void => {
        if (this.recent_strategies.length === 0 || this.tab_name !== tabs_title.TAB_RECENT) return;
        this.setOpenButtonDisabled(true);
        this.loadStrategyOnModalRecentPreview(this.selected_strategy_id);
        this.updateXmlValuesOnStrategySelection();
        this.setOpenButtonDisabled(false);
    };

    onLoadModalClose = (): void => {
        if (this.local_workspace) {
            this.local_workspace = null;
        }
        this.setActiveTabIndex(0); // Reset to first tab.
        this.setLoadedLocalFile(null);
    };

    onZoomInOutClick = (is_zoom_in: string): void => {
        if (this.preview_workspace) {
            this.preview_workspace.zoomCenter(is_zoom_in ? 1 : -1);
        }
    };

    setActiveTabIndex = (index: number): void => {
        this.active_index = index;
    };

    setLoadedLocalFile = (loaded_local_file: File | null): void => {
        this.loaded_local_file = loaded_local_file;
    };

    setRecentStrategies = (recent_strategies: TStrategy[]): void => {
        this.recent_strategies = recent_strategies;
    };

    refreshStrategies = (): void => {
        this.setRecentStrategies(this.recent_strategies);
    };

    setSelectedStrategyId = (selected_strategy_id: string): void => {
        this.selected_strategy_id = selected_strategy_id;
    };

    toggleExplanationExpand = (): void => {
        this.is_explanation_expand = !this.is_explanation_expand;
    };

    toggleLoadModal = (): void => {
        this.is_load_modal_open = !this.is_load_modal_open;
        this.recent_workspace?.dispose();
        this.recent_workspace = null;
        this.setLoadedLocalFile(null);
    };

    toggleTourLoadModal = (toggle = !this.is_load_modal_open) => {
        this.is_load_modal_open = toggle;
    };

    updateListStrategies = (workspaces: Array<TStrategy>): void => {
        if (workspaces) {
            (this.dashboard_strategies as Array<TStrategy>) = workspaces;
        }
    };

    getSaveType = (save_type: { [key: string]: string } | string): string => {
        switch (save_type) {
            case save_types.UNSAVED:
                return localize('Unsaved');
            case save_types.LOCAL:
                return localize('Local');
            case save_types.GOOGLE_DRIVE:
                return localize('Google Drive');
            default:
                return localize('Unsaved');
        }
    };

    onToggleDeleteDialog = (is_delete_modal_open: boolean): void => {
        this.is_delete_modal_open = is_delete_modal_open;
    };

    resetBotBuilderStrategy = () => {
        const workspace = window.Blockly.derivWorkspace;
        if (workspace) {
            window.Blockly.derivWorkspace.asyncClear();
            window.Blockly.Xml.domToWorkspace(window.Blockly.utils.xml.textToDom(workspace.cached_xml.main), workspace);
            window.Blockly.derivWorkspace.strategy_to_load = workspace.cached_xml.main;
        }
    };

    loadStrategyToBuilder = async (strategy: TStrategy, is_show_notification: boolean = true) => {
        if (strategy?.id) {
            await load({
                block_string: strategy.xml,
                strategy_id: strategy.id,
                file_name: strategy.name,
                workspace: window.Blockly?.derivWorkspace,
                from: strategy.save_type,
                drop_event: {},
                showIncompatibleStrategyDialog: false,
                show_snackbar: is_show_notification,
            });
            window.Blockly.derivWorkspace.strategy_to_load = strategy.xml;
        }
    };

    refreshStrategiesTheme = async () => {
        if (this.recent_workspace) {
            (this.recent_workspace as any).RTL = isDbotRTL();
        }
        await load({
            block_string: this.selected_strategy?.xml,
            drop_event: {},
            workspace: this.recent_workspace,
            file_name: this.selected_strategy?.name,
            strategy_id: this.selected_strategy?.id,
            from: this.selected_strategy?.save_type,
            showIncompatibleStrategyDialog: false,
            show_snackbar: false,
        });
    };

    loadFileFromRecent = async () => {
        this.is_open_button_loading = true;
        if (!this.selected_strategy) {
            window.Blockly.derivWorkspace.asyncClear();
            window.Blockly.Xml.domToWorkspace(
                window.Blockly.utils.xml.textToDom(window.Blockly.derivWorkspace.strategy_to_load),
                window.Blockly.derivWorkspace
            );
            this.is_open_button_loading = false;
            return;
        }

        removeExistingWorkspace(this.selected_strategy.id);
        await load({
            block_string: this.selected_strategy?.xml,
            strategy_id: this.selected_strategy.id,
            file_name: this.selected_strategy.name,
            workspace: window.Blockly.derivWorkspace,
            from: this.selected_strategy.save_type,
            drop_event: {},
            showIncompatibleStrategyDialog: false,
        });
        const recent_files = await getSavedWorkspaces();
        recent_files.map((strategy: TStrategy) => {
            const { xml, id } = strategy;
            if (this.selected_strategy.id === id) {
                window.Blockly.derivWorkspace.strategy_to_load = xml;
            }
        });
        this.is_open_button_loading = false;
    };

    loadFileFromLocal = (): void => {
        this.is_open_button_loading = true;
        if (this.loaded_local_file) {
            this.readFile(false, {} as DragEvent, this.loaded_local_file);
        }
    };

    onActiveIndexChange = (): void => {
        this.setOpenButtonDisabled(true);
        if (this.tab_name === tabs_title.TAB_RECENT) {
            this.loadStrategyOnModalRecentPreview(this.selected_strategy_id);
            this.updateXmlValuesOnStrategySelection();
        } else if (this.recent_workspace) {
            setTimeout(() => {
                // Dispose of recent workspace when switching away from Recent tab.
                // Process in next cycle so user doesn't have to wait.
                this.recent_workspace?.dispose();
                this.recent_workspace = null;
            });
        }

        if (this.tab_name === tabs_title.TAB_LOCAL) {
            if (!this.drop_zone) {
                this.drop_zone = document.querySelector('load-strategy__local-dropzone-area');

                if (this.drop_zone) {
                    this.drop_zone.addEventListener('drop', event => this.handleFileChange(event, false));
                }
            }
        }

        // Dispose of local workspace when switching away from Local tab.
        else if (this.local_workspace) {
            setTimeout(() => {
                this.local_workspace?.dispose();
                this.local_workspace = null;
                this.setLoadedLocalFile(null);
            }, 0);
        }

        // Forget about drop zone when not on Local tab.
        if (this.tab_name !== tabs_title.TAB_LOCAL && this.drop_zone) {
            this.drop_zone.removeEventListener('drop', event => this.handleFileChange(event, false));
        }
        this.setOpenButtonDisabled(false);
    };

    handleFileChange = (
        event: React.MouseEvent | React.FormEvent<HTMLFormElement> | DragEvent,
        is_body = true
    ): boolean => {
        this.imported_strategy_type = 'pending';
        this.upload_id = uuidv4();
        let files;
        if (event.type === 'drop') {
            event.stopPropagation();
            event.preventDefault();
            ({ files } = event.dataTransfer as DragEvent);
        } else {
            ({ files } = event.target);
        }

        const [file] = files;

        if (!is_body) {
            if (file.name.includes('xml')) {
                this.setLoadedLocalFile(file);
                this.getDashboardStrategies();
            } else {
                return false;
            }
        }
        this.readFile(!is_body, event as DragEvent, file);
        (event.target as HTMLInputElement).value = '';
        return true;
    };

    readFile = (is_preview: boolean, drop_event: DragEvent, file: File): void => {
        const reader = new FileReader();
        const file_name = file?.name.replace(/\.[^/.]+$/, '') || '';

        reader.onload = action(async e => {
            const load_options = {
                block_string: e?.target?.result,
                drop_event,
                from: save_types.LOCAL,
                workspace: null as window.Blockly.WorkspaceSvg | null,
                file_name,
                strategy_id: '',
                showIncompatibleStrategyDialog: false,
            };
            if (this.local_workspace) {
                this.local_workspace.dispose();
                this.local_workspace = null;
            }
            this.loadStrategyOnModalLocalPreview(load_options);
            this.setOpenButtonDisabled(false);
        });

        reader.readAsText(file);
    };

    saveStrategyToLocalStorage = async () => {
        const xmlValues = window.Blockly.xmlValues;
        if (!xmlValues?.convertedDom) return;
        const { save_modal } = this.root_store;
        const { updateBotName } = save_modal;
        const { convertedDom, from, file_name } = xmlValues;
        updateBotName(file_name);
        await saveWorkspaceToRecent(convertedDom, from);
        const recent_files = await getSavedWorkspaces();
        if (recent_files?.length > 0) this.setSelectedStrategyId(recent_files[0]?.id);
    };

    loadStrategyOnBotBuilder = async () => {
        const xmlValues = window.Blockly.xmlValues;
        const derivWorkspace = window.Blockly.derivWorkspace;
        let convertedDom = xmlValues?.convertedDom;
        if (!convertedDom && this.selected_strategy?.xml) {
            convertedDom = window.Blockly.utils.xml.textToDom(this.selected_strategy.xml);
        }
        if (!convertedDom || !derivWorkspace) return false;

        const strategy_id =
            xmlValues?.strategy_id ||
            this.selected_strategy?.id ||
            window.Blockly.utils?.idGenerator?.genUid?.() ||
            `${Date.now()}`;

        if (this.is_load_modal_open) {
            this.toggleLoadModal();
        }
        this.root_store.dashboard.setPreviewOnPopup(false);
        await waitForBuilderCanvas();

        const event_group = `dbot-load${Date.now()}`;
        await loadWorkspace(convertedDom, event_group, derivWorkspace);
        window.Blockly.Events.setGroup(false);
        derivWorkspace.clearUndo();
        derivWorkspace.current_strategy_id = strategy_id;

        api_base.toggleRunButton(false);
        this.root_store.blockly_store.checkForSavedBots();
        revealLoadedWorkspace(derivWorkspace);
        return true;
    };

    updateXmlValuesOnStrategySelection = () => {
        if (this.recent_strategies.length === 0 || !this.selected_strategy?.xml) return;
        updateXmlValues({
            strategy_id: this.selected_strategy_id || this.selected_strategy.id,
            convertedDom: window?.Blockly?.utils?.xml?.textToDom(this.selected_strategy.xml),
            file_name: this.selected_strategy.name,
            from: this.selected_strategy.save_type || save_types.UNSAVED,
        });
    };

    fitPreviewWorkspace = (workspace: window.Blockly.WorkspaceSvg | null) => {
        const container = document.getElementById('load-strategy__blockly-container');
        if (!workspace || !container) return;

        window.Blockly.svgResize?.(workspace);
        const hole = container.getBoundingClientRect();
        if (hole.width < 80 || hole.height < 80) return;

        const blocks = workspace.getTopBlocks?.(false) ?? [];
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        blocks.forEach(block => {
            const xy = block.getRelativeToSurfaceXY?.();
            const size = block.getHeightWidth?.();
            if (!xy || !size) return;
            minX = Math.min(minX, xy.x);
            minY = Math.min(minY, xy.y);
            maxX = Math.max(maxX, xy.x + size.width);
            maxY = Math.max(maxY, xy.y + size.height);
        });
        if (!Number.isFinite(minX)) return;

        const needed =
            Math.min(hole.width / Math.max(maxX - minX, 1), hole.height / Math.max(maxY - minY, 1)) * 0.9;
        const next_scale = Math.max(0.4, Math.min(1, needed));
        if (Math.abs(next_scale - (workspace.scale || 1)) >= 0.02) {
            workspace.setScale(next_scale);
            window.Blockly.svgResize?.(workspace);
        }

        let unionLeft = Infinity;
        let unionTop = Infinity;
        let unionRight = -Infinity;
        let unionBottom = -Infinity;
        blocks.forEach(block => {
            const root = block.getSvgRoot?.();
            if (!root) return;
            const rect = root.getBoundingClientRect();
            if (rect.width < 2 && rect.height < 2) return;
            unionLeft = Math.min(unionLeft, rect.left);
            unionTop = Math.min(unionTop, rect.top);
            unionRight = Math.max(unionRight, rect.right);
            unionBottom = Math.max(unionBottom, rect.bottom);
        });
        if (!Number.isFinite(unionLeft) || !workspace.scrollbar) return;

        const metrics = workspace.getMetrics?.();
        if (!metrics) return;
        const pad = 16;
        workspace.scrollbar.set(
            metrics.viewLeft - metrics.scrollLeft - (hole.left + pad - unionLeft),
            metrics.viewTop - metrics.scrollTop - (hole.top + pad - unionTop)
        );
    };

    loadStrategyOnModalRecentPreview = async workspace_id => {
        this.setOpenButtonDisabled(true);
        if (this.recent_strategies.length === 0 || this.tab_name !== tabs_title.TAB_RECENT) {
            this.setOpenButtonDisabled(false);
            return;
        }

        const inject_options = { ...inject_workspace_options, theme: window?.Blockly?.Themes?.zelos_renderer };

        this.setLoadedLocalFile(null);
        this.setSelectedStrategyId(workspace_id);

        await waitForDomElement('#load-strategy__blockly-container');
        const ref_preview = document.getElementById('load-strategy__blockly-container');

        if (ref_preview) {
            if (!this.recent_workspace) this.recent_workspace = window.Blockly.inject(ref_preview, inject_options);
            (this.recent_workspace as any).RTL = isDbotRTL();

            const xml = this.selected_strategy?.xml;
            if (xml && this.recent_workspace) {
                try {
                    const convertedDom = window.Blockly.utils.xml.textToDom(xml);
                    window.Blockly.Xml.clearWorkspaceAndLoadFromXml(convertedDom, this.recent_workspace);
                    this.fitPreviewWorkspace(this.recent_workspace);
                    window.setTimeout(() => this.fitPreviewWorkspace(this.recent_workspace), 50);
                } catch (error) {
                    console.error('[LoadModal] Preview load failed', error);
                }
            }
        }
        this.setOpenButtonDisabled(false);
    };

    loadStrategyOnModalLocalPreview = async load_options => {
        this.setOpenButtonDisabled(true);
        const injectWorkspace = { ...inject_workspace_options, theme: window?.Blockly?.Themes?.zelos_renderer };

        await waitForDomElement('#load-strategy__blockly-container');
        const ref_preview = document.getElementById('load-strategy__blockly-container');
        if (!this.local_workspace) this.local_workspace = await window.Blockly.inject(ref_preview, injectWorkspace);

        load_options.workspace = this.local_workspace;

        if (load_options.workspace) {
            (load_options.workspace as any).RTL = isDbotRTL();
        }

        /* [AI] - Analytics event tracking removed - see migrate-docs/MONITORING_PACKAGES.md for re-implementation guide */
        /* [/AI] */

        await load({ ...load_options, show_snackbar: false });
        this.fitPreviewWorkspace(this.local_workspace);
        window.setTimeout(() => this.fitPreviewWorkspace(this.local_workspace), 50);
        /* [AI] - Analytics event tracking removed - see migrate-docs/MONITORING_PACKAGES.md for re-implementation guide */
        /* [/AI] */
    };
}
