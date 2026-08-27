import React from 'react';
import { observer } from 'mobx-react-lite';
import Flyout from '@/components/flyout';
import { useStore } from '@/hooks/useStore';
import StopBotModal from '../dashboard/stop-bot-modal';
import Toolbar from './toolbar';
import Toolbox from './toolbox';
import './workspace.scss';

const WorkspaceWrapper = observer(() => {
    const { blockly_store } = useStore();
    const { onMount, onUnmount, workspace_ready } = blockly_store;
    const has_workspace = workspace_ready || Boolean(window.Blockly?.derivWorkspace);

    React.useEffect(() => {
        onMount();
        return () => {
            onUnmount();
        };
    }, []);

    if (!has_workspace) return null;

    return (
        <React.Fragment>
            <Toolbox />
            <Toolbar />
            <Flyout />
            <StopBotModal />
        </React.Fragment>
    );
});

export default WorkspaceWrapper;
