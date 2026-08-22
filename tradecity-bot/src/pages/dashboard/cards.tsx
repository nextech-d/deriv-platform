import React from 'react';
import { observer } from 'mobx-react-lite';
import GoogleDrive from '@/components/load-modal/google-drive';
import Dialog from '@/components/shared_ui/dialog';
import MobileFullPageModal from '@/components/shared_ui/mobile-full-page-modal';
import { DBOT_TABS } from '@/constants/bot-contents';
import { useStore } from '@/hooks/useStore';
import { writeFreeBotsTier } from '@/utils/free-bots-tier';
import { localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';

type TCardProps = {
    is_mobile: boolean;
    handleTabChange: (active_number: number) => void;
};

type HeroAccent = 'load' | 'charts' | 'premium' | 'standard' | 'analysis';

type HeroWindow = {
    id: string;
    title: string;
    summary: string;
    accent: HeroAccent;
    icon: React.ReactNode;
    onOpen: () => void;
};

const WindowIcon = ({ path, stroke }: { path: string; stroke?: boolean }) => (
    <svg viewBox='0 0 24 24' aria-hidden='true' data-stroke={stroke ? 'true' : undefined}>
        <path d={path} />
    </svg>
);

const Cards = observer(({ is_mobile, handleTabChange }: TCardProps) => {
    const { dashboard, load_modal } = useStore();
    const { toggleLoadModal, setActiveTabIndex } = load_modal;
    const { isDesktop } = useDevice();
    const { onCloseDialog, dialog_options, is_dialog_open, setActiveTab, setPreviewOnPopup } = dashboard;

    const openFileLoader = () => {
        toggleLoadModal();
        setActiveTabIndex(is_mobile ? 0 : 1);
        setActiveTab(DBOT_TABS.BOT_BUILDER);
    };

    const openTradingBots = (tier: 'free' | 'premium') => {
        writeFreeBotsTier(tier);
        handleTabChange(DBOT_TABS.FREE_BOTS);
    };

    const windows: HeroWindow[] = [
        {
            id: 'load-bot',
            title: 'Load bot',
            summary: 'Import an XML strategy from your device.',
            accent: 'load',
            icon: (
                <WindowIcon path='M4 7.5A2.5 2.5 0 016.5 5H9l1.2 1.6H17.5A2.5 2.5 0 0120 9.1V17a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 17z' />
            ),
            onOpen: openFileLoader,
        },
        {
            id: 'charts',
            title: 'Charts',
            summary: 'Read price action before you trade.',
            accent: 'charts',
            icon: <WindowIcon stroke path='M4 18h16M6 14l3.4-4.2 2.8 2.4 5.8-6.6' />,
            onOpen: () => handleTabChange(DBOT_TABS.CHART),
        },
        {
            id: 'premium-bots',
            title: 'Premium bots',
            summary: 'Open advanced ready-made bots.',
            accent: 'premium',
            icon: <WindowIcon path='M4 8.2l3.6 2.2L12 5.4l4.4 5 3.6-2.2-.8 9.4H4.8zM7 19.2h10' />,
            onOpen: () => openTradingBots('premium'),
        },
        {
            id: 'standard',
            title: 'Standard',
            summary: 'Browse standard strategies to load and edit.',
            accent: 'standard',
            icon: (
                <WindowIcon
                    stroke
                    path='M12 11.6a2.4 2.4 0 100-4.8 2.4 2.4 0 000 4.8zm-5.2 6.2c.7-2.2 2.7-3.4 5.2-3.4s4.5 1.2 5.2 3.4M8.4 8.2l-1.8-2M15.6 8.2l1.8-2'
                />
            ),
            onOpen: () => openTradingBots('free'),
        },
        {
            id: 'analysis-tool',
            title: 'Analysis tool',
            summary: 'Study signals before opening trades.',
            accent: 'analysis',
            icon: <WindowIcon stroke path='M4 18V9.5M9 18V6M14 18v-7.2M19 18V8' />,
            onOpen: () => handleTabChange(DBOT_TABS.ANALYSIS_TOOL),
        },
    ];

    return (
        <div className='tab__dashboard__table'>
            <div className='dashboard-hero__windows' id='tab__dashboard__table__tiles'>
                {windows.map(windowItem => (
                    <button
                        key={windowItem.id}
                        type='button'
                        id={windowItem.id}
                        data-accent={windowItem.accent}
                        className='dashboard-hero__window'
                        onClick={windowItem.onOpen}
                    >
                        <span className='dashboard-hero__window-icon'>{windowItem.icon}</span>
                        <span className='dashboard-hero__window-copy'>
                            <span className='dashboard-hero__window-title'>{windowItem.title}</span>
                            <span className='dashboard-hero__window-summary'>{windowItem.summary}</span>
                        </span>
                    </button>
                ))}
            </div>

            {!isDesktop ? (
                <Dialog
                    title={dialog_options.title}
                    is_visible={is_dialog_open}
                    onCancel={onCloseDialog}
                    is_mobile_full_width
                    className='dc-dialog__wrapper--google-drive'
                    has_close_icon
                >
                    <GoogleDrive />
                </Dialog>
            ) : (
                <MobileFullPageModal
                    is_modal_open={is_dialog_open}
                    className='load-strategy__wrapper'
                    header={localize('Load strategy')}
                    onClickClose={() => {
                        setPreviewOnPopup(false);
                        onCloseDialog();
                    }}
                    height_offset='80px'
                >
                    <div label='Google Drive' className='google-drive-label'>
                        <GoogleDrive />
                    </div>
                </MobileFullPageModal>
            )}
        </div>
    );
});

export default Cards;
