import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import CopyTraderDesk from './copy-trader-desk';

const CopyTraderPanel = observer(() => {
    const { client } = useStore();
    return <CopyTraderDesk isLoggedIn={Boolean(client?.is_logged_in)} />;
});

export default CopyTraderPanel;
