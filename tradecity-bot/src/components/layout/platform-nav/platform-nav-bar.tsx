import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import { PLATFORM_NAV_ITEMS, PLATFORM_NAV_SPLIT_AFTER } from '@/constants/platform-nav-items';
import './platform-nav-bar.scss';

/**
 * Legacy TradeCity platform menu — label-only placeholders (no navigation).
 */
const PlatformNavBar = observer(() => {
    return (
        <nav className='tc-platform-nav' aria-label='Platform navigation'>
            <div className='tc-platform-nav__track'>
                {PLATFORM_NAV_ITEMS.map(item => (
                    <span
                        key={item.id}
                        className={clsx(
                            'tc-platform-nav__item',
                            PLATFORM_NAV_SPLIT_AFTER.has(item.id) && 'tc-platform-nav__item--split'
                        )}
                        aria-disabled='true'
                        title={item.label}
                    >
                        {item.label}
                    </span>
                ))}
            </div>
        </nav>
    );
});

export default PlatformNavBar;
