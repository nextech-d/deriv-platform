import { observer } from 'mobx-react-lite';
import { DBOT_TABS } from '@/constants/bot-contents';
import { useStore } from '@/hooks/useStore';
import { Loader } from '@deriv-com/ui';

const BlocklyLoading = observer(() => {
    const { blockly_store, dashboard, load_modal } = useStore();
    const { is_loading } = blockly_store;
    const on_builder_surface =
        dashboard.active_tab === DBOT_TABS.BOT_BUILDER || load_modal.is_load_modal_open;
    const show_loader = is_loading && on_builder_surface;

    return (
        <>
            {show_loader ? (
                <div className='bot__loading' data-testid='blockly-loader'>
                    <Loader />
                    <div>Loading Blockly...</div>
                </div>
            ) : null}
        </>
    );
});

export default BlocklyLoading;
